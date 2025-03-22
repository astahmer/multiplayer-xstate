import { Box, Button, Container, Flex, HStack } from "@chakra-ui/react";
import { generateSlug } from "random-word-slugs";
import { GameClient } from "./game.client";
import { Router } from "../router";
import { getPlayerId } from "../../server/game.machine.context";

export const GameDevtools = () => {
	const actor = GameClient.useContext();
	const context = actor.context;

	const currentPlayerActor = context.actorList.find(
		(child) => child.id === getPlayerId(actor._userId),
	);
	const currentPlayer = currentPlayerActor?.getSnapshot().context;

	return (
		<Container maxW="2xl">
			<span>current: {currentPlayer?.name}</span>
			<details>
				<summary>
					<HStack>
						<span>value: {JSON.stringify(actor.snapshot.value)}</span>
					</HStack>
				</summary>
				<Box as="pre" overflow="auto" maxHeight="300px">
					{JSON.stringify(actor.snapshot, null, 4)}
				</Box>
			</details>

			<Flex justify="center" gap={4}>
				<Button
					colorPalette="blue"
					size="lg"
					onClick={() =>
						actor.partySocket.send(
							JSON.stringify({ type: "party.snapshot.get" }),
						)
					}
				>
					Refresh actor
				</Button>
				<Button
					colorPalette="green"
					size="lg"
					onClick={() =>
						window.location.assign(Router.Room({ roomId: generateSlug() }))
					}
				>
					Change room
				</Button>
			</Flex>
		</Container>
	);
};
