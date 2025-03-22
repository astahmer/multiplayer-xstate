import {
	Badge,
	Box,
	Button,
	Editable,
	Flex,
	HStack,
	IconButton,
	Stack,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import { GiPerspectiveDiceSixFacesTwo } from "react-icons/gi";
import {
	LuCheck,
	LuPencilLine,
	LuThumbsUp,
	LuWifiOff,
	LuX,
} from "react-icons/lu";
import { type Player, getPlayerId } from "../../server/game.machine.context";
import { GameClient } from "../game/game.client";
import { generateRandomName } from "../pages/username.section";
import { Tooltip } from "./ui/tooltip";

export const PlayerCard = (props: { player: Player }) => {
	const { player } = props;

	const actor = GameClient.useContext();
	const isCurrent = player.id === actor._userId;

	return (
		<Box borderWidth={1} borderRadius="lg" p={4} position="relative">
			{player.isConnected ? null : (
				<Flex position="absolute" inset="0">
					<Box margin="auto" color="red.600" textStyle="2xl" fontWeight="bold">
						Left the room
					</Box>
				</Flex>
			)}
			<Stack gap="4">
				<Flex
					align="center"
					filter={player.isConnected ? "none" : "blur(2px) saturate(30%)"}
				>
					<HStack>
						<Stack align="start" gap="1">
							<HStack>
								{isCurrent && actor.matches("idle") ? (
									<PlayerEditableName player={player} />
								) : (
									<Box fontWeight="bold">{player.name}</Box>
								)}
							</HStack>
							<Badge colorPalette={player.state === "ready" ? "green" : "gray"}>
								{player.state === "ready" ? "Ready" : "Not Ready"}
							</Badge>
						</Stack>
					</HStack>

					{isCurrent ? <PlayerCardActions player={player} /> : null}
				</Flex>
			</Stack>
		</Box>
	);
};

const PlayerEditableName = (props: { player: Player }) => {
	const { player } = props;

	const actor = GameClient.useContext();
	const context = actor.context;

	const currentPlayerActor = context.actorList.find(
		(child) => child.id === getPlayerId(actor._userId),
	)!;

	return (
		<>
			<Tooltip content="Generate random name">
				<IconButton
					onClick={() => {
						const randomName = generateRandomName();
						actor.sendTo(currentPlayerActor, {
							type: "SetName",
							name: randomName,
						});
						localStorage.setItem("username", randomName);
					}}
					variant="ghost"
					size="xs"
					padding="1"
					height="100%"
					_hover={{
						transform: "scale(1.1) rotate(180deg)",
					}}
				>
					<GiPerspectiveDiceSixFacesTwo
						style={{ width: "100%", height: "100%" }}
					/>
				</IconButton>
			</Tooltip>
			<Editable.Root
				defaultValue={player.name}
				onValueChange={(details) => {
					if (!details.value.trim()) return;

					actor.sendTo(currentPlayerActor, {
						type: "SetName",
						name: details.value,
					});
					localStorage.setItem("username", details.value);
				}}
				onValueRevert={(details) => {
					actor.sendTo(currentPlayerActor, {
						type: "SetName",
						name: details.value,
					});
					localStorage.setItem("username", details.value);
				}}
			>
				<Editable.Input />
				<Editable.Control>
					<Editable.EditTrigger>
						<HStack>
							<Editable.Context>
								{(ctx) =>
									!ctx.editing && <Box fontWeight="bold">{player.name}</Box>
								}
							</Editable.Context>
							<IconButton as="div" variant="ghost" size="xs">
								<LuPencilLine />
							</IconButton>
						</HStack>
					</Editable.EditTrigger>
					<Editable.CancelTrigger asChild>
						<IconButton variant="outline" size="xs">
							<LuX />
						</IconButton>
					</Editable.CancelTrigger>
					<Editable.SubmitTrigger asChild>
						<IconButton variant="outline" size="xs">
							<LuCheck />
						</IconButton>
					</Editable.SubmitTrigger>
				</Editable.Control>
			</Editable.Root>
		</>
	);
};

const PlayerCardActions = (props: { player: Player; children?: ReactNode }) => {
	const { player, children } = props;
	const actor = GameClient.useContext();
	const hasVotedForResume = actor.context.currentVotes.some(
		(vote) => vote.type === "resume" && vote.fromPlayerId === player.id,
	);

	return (
		<HStack marginLeft="auto">
			{children}
			<GameClient.Matches
				value={["idle", "starting", { started: "preparing" }]}
			>
				{player.state === "idle" ? (
					<Button
						onClick={() => actor.send({ type: "Ready" })}
						variant="subtle"
						colorPalette="green"
					>
						Ready ?
					</Button>
				) : player.state === "ready" ? (
					<Button
						onClick={() => {
							actor.send({ type: "CancelReady" });
						}}
						variant="subtle"
						colorPalette="red"
					>
						Wait I'm not ready
					</Button>
				) : null}
			</GameClient.Matches>

			<GameClient.Matches value={{ started: { game: "paused" } }}>
				<Button
					onClick={() => actor.send({ type: "VoteResume" })}
					variant="surface"
					colorPalette="blue"
					disabled={hasVotedForResume}
				>
					Vote for resuming
				</Button>
				<ResumeVoteList />
			</GameClient.Matches>
		</HStack>
	);
};

const ResumeVoteList = () => {
	const actor = GameClient.useContext();
	const context = actor.context;

	const playerList = actor.context.actorList.map(
		(ref) => ref.getSnapshot().context,
	);
	const currentPlayer = playerList.find(
		(player) => player.id === actor._userId,
	);
	if (!currentPlayer) return null;

	const currentResumeVotes = context.currentVotes.filter(
		(vote) => vote.type === "resume",
	);
	if (currentResumeVotes.length === 0) return null;

	const connectedPlayers = playerList.filter((player) => player.isConnected);

	return (
		<Box
			position="fixed"
			bottom="10"
			right="20%"
			marginX="auto"
			zIndex="1"
			display="flex"
		>
			<Stack
				gap="4"
				marginX="auto"
				p="4"
				borderRadius="md"
				bg="gray.900"
				justifyContent="center"
				alignItems="center"
				colorPalette={currentResumeVotes.length === 0 ? "gray" : "green"}
				color="white"
				fontSize="md"
				fontWeight="bold"
			>
				<Box fontSize="sm">
					Resume game ({currentResumeVotes.length}/{connectedPlayers.length})
				</Box>
				<HStack>
					{playerList.map((player) => {
						const hasVotedForResumeping = currentResumeVotes.some(
							(vote) => vote.fromPlayerId === player.id,
						);

						const isSelf = player.id === currentPlayer.id;

						return (
							<Tooltip content={player.name} key={player.id}>
								<div>
									<IconButton
										as="div"
										variant={
											hasVotedForResumeping && isSelf ? "solid" : "surface"
										}
										size="md"
										colorPalette={hasVotedForResumeping ? "green" : "gray"}
										pointerEvents="none"
										aria-readonly
										px="2"
									>
										{hasVotedForResumeping ? (
											<LuThumbsUp />
										) : !player.isConnected ? (
											<LuWifiOff />
										) : null}
									</IconButton>
								</div>
							</Tooltip>
						);
					})}
				</HStack>
			</Stack>
		</Box>
	);
};
