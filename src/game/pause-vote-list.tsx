import { Box, Stack, HStack, IconButton } from "@chakra-ui/react";
import { LuThumbsUp, LuWifiOff } from "react-icons/lu";
import { Tooltip } from "../components/ui/tooltip";
import { GameClient } from "./game.client";

export const PauseVoteList = (props: { label: string }) => {
	const actor = GameClient.useContext();
	const context = actor.context;

	const playerList = actor.context.actorList.map(
		(ref) => ref.getSnapshot().context,
	);
	const currentPlayer = playerList.find(
		(player) => player.id === actor._userId,
	);
	if (!currentPlayer) return null;

	const currentPauseVotes = context.currentVotes.filter(
		(vote) => vote.type === "pause",
	);
	if (currentPauseVotes.length === 0) return null;

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
				colorPalette={currentPauseVotes.length === 0 ? "gray" : "green"}
				color="white"
				fontSize="md"
				fontWeight="bold"
			>
				<Box fontSize="sm">
					{props.label} ({currentPauseVotes.length}/{connectedPlayers.length})
				</Box>
				<HStack>
					{playerList.map((player) => {
						const hasVotedForPausing = currentPauseVotes.some(
							(vote) => vote.fromPlayerId === player.id,
						);

						const isSelf = player.id === currentPlayer.id;

						return (
							<Tooltip content={player.name} key={player.id}>
								<div>
									<IconButton
										as="div"
										variant={hasVotedForPausing && isSelf ? "solid" : "surface"}
										size="md"
										colorPalette={hasVotedForPausing ? "green" : "gray"}
										pointerEvents="none"
										aria-readonly
										px="2"
									>
										{hasVotedForPausing ? (
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
