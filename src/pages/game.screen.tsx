import { Box, Container, Stack } from "@chakra-ui/react";
import { GameClient } from "../game/game.client";
import { GameDevtools } from "../game/game.devtools";
import { GameHeader } from "../game/game.header";
import { PlayerCard } from "../components/player-card";

export const GameScreen = () => {
	return (
		<Stack gap={8} align="center">
			<Container maxW="5xl" pt={8} h="100%">
				<Box css={{ pt: "8!", position: "relative" }}>
					<Stack mt="2" gap="4">
						<GameHeader />
						<PlayerList />
					</Stack>

					<GameClient.Matches value="done">
						<Stack textAlign="center">
							<span>Hope you enjoyed the game! :)</span>
						</Stack>
					</GameClient.Matches>
				</Box>
			</Container>

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
