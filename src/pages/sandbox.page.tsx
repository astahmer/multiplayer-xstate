import {
	Box,
	Button,
	Center,
	Container,
	HStack,
	Input,
	Stack,
} from "@chakra-ui/react";

import { type ReactNode, useEffect, useState } from "react";
import { EnvConfig } from "../env.config";

export const SandboxLayout = (props: { children: ReactNode }) => {
	return (
		<Box width="100%" height="100%" overflow="auto">
			<Container maxW="container.xl" py={8} width="100%" height="100%">
				<Center h="100%">{props.children}</Center>
			</Container>
		</Box>
	);
};

export const SandboxPage = () => {
	return (
		<SandboxLayout>
			<Stack h="100%">
				<Counter />
				<a href="/api/todos?name=abc">Go to TodoList sandbox</a>
				<a href="/payment">Go to Payment sandbox</a>
			</Stack>
		</SandboxLayout>
	);
};

const Counter = () => {
	const [name, setName] = useState("abc");
	const [count, setCount] = useState(null as number | null);

	const getAndSetCurrent = (doName: string) =>
		fetch(`http://${EnvConfig.Host}/api/counter/current?name=${doName}`)
			.then((res) => res.json())
			.then((json) => setCount((json as { current: number }).current));

	useEffect(() => {
		getAndSetCurrent(name);
	}, []);

	return (
		<Stack gap="4" px="8" py="6" boxShadow="md" maxWidth="300px" mx="auto">
			<Box fontSize="xl" fontWeight="bold">
				Hono Counter
			</Box>
			<Stack>
				<span>Durable Object name:</span>
				<Input
					name="do-name"
					value={name}
					onChange={(e) => {
						setName(e.target.value);
						getAndSetCurrent(e.target.value);
					}}
				/>
			</Stack>
			<HStack>
				<span>Counter value:</span>
				<span>{count ?? "Unknown"}</span>
			</HStack>
			<HStack>
				<Button
					colorPalette="green"
					onClick={() =>
						fetch(`http://${EnvConfig.Host}/api/counter/increment?name=${name}`)
							.then((res) => res.json())
							.then((json) => setCount((json as { current: number }).current))
					}
				>
					Increment
				</Button>
				<Button
					colorPalette="red"
					onClick={() =>
						fetch(`http://${EnvConfig.Host}/api/counter/decrement?name=${name}`)
							.then((res) => res.json())
							.then((json) => setCount((json as { current: number }).current))
					}
				>
					Decrement
				</Button>
			</HStack>
		</Stack>
	);
};
