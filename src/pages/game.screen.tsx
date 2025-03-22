import { Box, Container, Stack } from "@chakra-ui/react";
import { GameClient } from "../game/game.client";
import { GameDevtools } from "../game/game.devtools";
import { GameHeader } from "../game/game.header";
import { PauseVoteList } from "../game/pause-vote-list";
import { PlayerCard } from "../components/player-card";
import { PhaseTimer } from "../components/phase-timer";

export const GameScreen = () => {
	const actor = GameClient.useContext();

	return (
		<Stack gap={8} align="center">
			<Container maxW="5xl" pt={8} h="100%">
				<Box css={{ pt: "8!", position: "relative" }}>
					<PhaseTimer />
					<Stack mt="2" gap="4">
						<GameHeader />
						<GameClient.Matches
							value={["idle", "starting", { started: "preparing" }]}
							or={actor.hasTag("paused")}
						>
							<PlayerList />
						</GameClient.Matches>
					</Stack>

					<GameClient.Matches value="done">
						<Stack textAlign="center">
							<span>Hope you enjoyed the game! :)</span>
						</Stack>
					</GameClient.Matches>
				</Box>
			</Container>

			<GameClient.Matches value={[{ started: { game: "playing" } }]}>
				<PauseVoteList label="Skip question" />
			</GameClient.Matches>
			<GameDevtools />
		</Stack>
	);
};

const PlayerList = () => {
	const actor = GameClient.useContext();
	const playerList = actor.context.actorList.map(
		(ref) => ref.getSnapshot().context,
	);

	return (
		<Stack gap={6}>
			{playerList.map((player) => (
				<PlayerCard key={player.id} player={player} />
			))}
		</Stack>
	);
};
