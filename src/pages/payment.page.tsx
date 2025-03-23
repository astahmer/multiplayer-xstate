import {
	Badge,
	Box,
	Button,
	Center,
	Flex,
	Grid,
	GridItem,
	HStack,
	Input,
	Stack,
} from "@chakra-ui/react";

import {
	QueryClient,
	QueryClientProvider,
	queryOptions,
	useQuery,
} from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { type PropsWithChildren, useState } from "react";
import {
	LuArrowRight,
	LuCircleAlert,
	LuCircleCheck,
	LuClock,
} from "react-icons/lu";
import {
	type EventFrom,
	type SnapshotFrom,
	type StateValueFrom,
	matchesState,
} from "xstate";
import type { PaymentActorType } from "../../party/xstate-payment.do";
import { SandboxLayout } from "./sandbox.page";

const queryClient = new QueryClient();

export const PaymentPage = () => {
	return (
		<SandboxLayout>
			<Stack h="100%">
				<QueryClientProvider client={queryClient}>
					<Payment />
				</QueryClientProvider>
			</Stack>
		</SandboxLayout>
	);
};

const paymentQuery = (paymentId: string) =>
	queryOptions({
		enabled: Boolean(paymentId),
		queryKey: ["payment", paymentId],
		queryFn: () =>
			fetch(`/api/payment/state?name=${paymentId}`).then(
				(res) =>
					res.json() as Promise<{ snapshot: SnapshotFrom<PaymentActorType> }>,
			),
		refetchInterval: (query) => {
			return !Array.from(query.state.data?.snapshot?.tags ?? []).includes(
				"final",
			)
				? 1000
				: false;
		},
	});

const Payment = () => {
	const search = new URLSearchParams(window.location.search);
	const [paymentId, setPaymentId] = useState<string>(
		search.get("paymentId") || "",
	);

	const query = useQuery(paymentQuery(paymentId));

	if (paymentId) {
		if (query.data?.snapshot?.value === "Needs confirm") {
			return (
				<>
					<Button
						onClick={() =>
							fetch(`/api/payment/send?name=${paymentId}`, {
								method: "POST",
								body: JSON.stringify({ type: "start" }),
							})
						}
					>
						Confirm payment
					</Button>
					<StateVisualizer value={query.data?.snapshot.value} />
					<ActivityLog logs={query.data?.snapshot.context.logs ?? []} />
				</>
			);
		}

		return (
			<PaymentWorkflow paymentId={paymentId}>
				{query.data?.snapshot?.value && (
					<>
						<StateVisualizer value={query.data?.snapshot.value} />
					</>
				)}
			</PaymentWorkflow>
		);
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();

				const formData = new FormData(e.target as HTMLFormElement);
				fetch(`/api/payment/init?name=${nanoid(5)}`, {
					method: "POST",
					body: JSON.stringify({
						sender: formData.get("sender")!,
						recipient: formData.get("recipient")!,
						amount: Number(formData.get("amount")!),
					}),
				})
					.then((res) => res.json())
					.then((json) => {
						const paymentId = (json as { paymentId: string }).paymentId;
						setPaymentId(paymentId);
						window.history.pushState(
							{},
							"",
							window.location.pathname + `?paymentId=${paymentId}`,
						);
					});
			}}
		>
			<Stack gap="4" px="8" py="6" m="auto">
				<Box fontSize="xl" fontWeight="bold">
					Payment State Machine
				</Box>
				<Stack>
					<span>From:</span>
					<Input name="sender" defaultValue="user-123" />
				</Stack>
				<Stack>
					<span>To:</span>
					<Input name="recipient" defaultValue="user-456" />
				</Stack>
				<Stack>
					<span>Amount:</span>
					<Input name="amount" type="number" defaultValue={100} />
				</Stack>
				<Button type="submit">Send</Button>
			</Stack>
		</form>
	);
};

const StateVisualizer = ({
	value,
}: {
	value: StateValueFrom<PaymentActorType>;
}) => {
	return (
		<Box borderWidth="1px" borderRadius="lg" overflow="hidden" p="4" mt="6">
			<Stack align="start" gap="4">
				<Box>
					<Box fontSize="lg" fontWeight="bold">
						State Machine Visualization
					</Box>
					<Box fontSize="sm">Payment process flow</Box>
				</Box>
				<Box overflowX="auto">
					<Grid templateColumns="repeat(3, 1fr)" gap="2">
						{[
							"Needs confirm",
							"Awaiting approval",
							"Approved",
							"Debited",
							"Awaiting admin approval",
							"Rejected",
							"Succeeded",
							"Cancelled",
							"Refunding",
						].map((state) => (
							<GridItem
								key={state}
								p="4"
								borderWidth="1px"
								borderRadius="lg"
								boxAlign="center"
								backgroundColor={value === state ? "blackAlpha.200" : "inherit"}
							>
								{state}
							</GridItem>
						))}
					</Grid>
					<Box mt="4" fontSize="sm" color="gray.500">
						Current state is highlighted
					</Box>
				</Box>
			</Stack>
		</Box>
	);
};

const ActivityLog = ({ logs }: { logs: string[] }) => {
	return (
		<Box borderWidth="1px" borderRadius="lg" overflow="hidden" p="4">
			<Stack align="start" gap="4">
				<Box>
					<Box fontSize="lg" fontWeight="bold">
						Activity Log
					</Box>
					<Box fontSize="sm">Payment process events</Box>
				</Box>
				<Stack maxHeight="300px" overflowY="auto">
					{logs.map((log, index) => (
						<Flex gap="4" key={index}>
							<Center
								w="6"
								h="6"
								bg="blackAlpha.100"
								borderRadius="full"
								flexShrink={0}
							>
								<LuArrowRight size={12} />
							</Center>
							<Box>{log}</Box>
						</Flex>
					))}
				</Stack>
			</Stack>
		</Box>
	);
};

function PaymentWorkflow(props: PropsWithChildren<{ paymentId: string }>) {
	const query = useQuery(paymentQuery(props.paymentId));
	const snapshot = query.data?.snapshot;

	if (query.status === "error") {
		return <span>Error: {query.error.message}</span>;
	}

	if (query.status === "pending") {
		return null;
	}

	if (!snapshot) {
		return (
			<Stack>
				<span>Payment request not found</span>
				<a href="/sandbox">Go Back</a>
			</Stack>
		);
	}

	const logs = snapshot.context.logs ?? [];
	const currentState = snapshot.value;

	const send = (event: EventFrom<PaymentActorType>) =>
		fetch(`/api/payment/send?name=${props.paymentId}`, {
			method: "POST",
			body: JSON.stringify(event),
		});

	const matches = (state: StateValueFrom<PaymentActorType>) =>
		matchesState(state, snapshot?.value ?? {});

	const canApprove =
		matches("Awaiting approval") || matches("Awaiting admin approval");

	return (
		<Box p="10">
			<Box fontSize="3xl" fontWeight="bold" mb="6">
				Payment State Machine
			</Box>

			<Grid templateColumns={{ base: "1fr", md: "2fr 1fr" }} gap="6">
				<Box borderWidth="1px" borderRadius="lg" overflow="hidden" p="4">
					<Stack align="start" gap="4">
						<Box>
							<Box fontSize="lg" fontWeight="bold">
								Payment Status
							</Box>
							<Box fontSize="sm">Current state and payment details</Box>
						</Box>
						<HStack gap="2">
							<Badge colorPalette={getStateColor(currentState)} px="2" py="1">
								<HStack gap="1">
									{getStateIcon(currentState)}
									<Box>{currentState}</Box>
								</HStack>
							</Badge>
						</HStack>
						<Grid templateColumns="repeat(2, 1fr)" gap="4">
							<Box>
								<Box fontSize="sm" color="gray.500">
									Payment ID
								</Box>
								<Box fontSize="lg" fontWeight="medium">
									{props.paymentId}
								</Box>
							</Box>
							<Box>
								<Box fontSize="sm" color="gray.500">
									Amount
								</Box>
								<Box fontSize="lg" fontWeight="medium">
									${snapshot.context.amount}
								</Box>
							</Box>
							<Box>
								<Box fontSize="sm" color="gray.500">
									Sender
								</Box>
								<Box fontSize="lg" fontWeight="medium">
									{snapshot.context.senderUserId}
								</Box>
							</Box>
							<Box>
								<Box fontSize="sm" color="gray.500">
									Recipient
								</Box>
								<Box fontSize="lg" fontWeight="medium">
									{snapshot.context.recipientUserId}
								</Box>
							</Box>
						</Grid>
						<HStack gap="4" justify="space-between" w="full">
							<Button
								onClick={() => send({ type: "approved" })}
								disabled={!canApprove}
							>
								{matches("Awaiting admin approval") ? "(Admin) " : ""}
								Approve Payment{" "}
								{matches("Awaiting approval")
									? `(${snapshot.context.secondsLeftToApprove}s left)`
									: ""}
							</Button>
							<Button
								onClick={() => send({ type: "rejected" })}
								colorPalette="red"
								disabled={!canApprove}
							>
								{matches("Awaiting admin approval") ? "(Admin) " : ""}
								Reject Payment{" "}
								{matches("Awaiting approval")
									? `(${snapshot.context.secondsLeftToApprove}s left)`
									: ""}
							</Button>
						</HStack>
					</Stack>
				</Box>
				<ActivityLog logs={logs} />
			</Grid>
			{props.children}
		</Box>
	);
}

const getStateColor = (state: StateValueFrom<PaymentActorType>) => {
	switch (state) {
		case "Awaiting approval":
		case "Awaiting admin approval":
			return "yellow";
		case "Approved":
		case "Debited":
		case "Succeeded":
			return "green";
		case "Rejected":
		case "Cancelled":
		case "Refunding":
			return "red";
		default:
			return "gray";
	}
};

const getStateIcon = (state: StateValueFrom<PaymentActorType>) => {
	switch (state) {
		case "Awaiting approval":
		case "Awaiting admin approval":
			return <LuClock size={20} />;
		case "Approved":
		case "Debited":
		case "Succeeded":
			return <LuCircleCheck size={20} />;
		case "Rejected":
		case "Cancelled":
		case "Refunding":
			return <LuCircleAlert size={20} />;
		default:
			return null;
	}
};
