import { Center, Stack, Box, HStack, Button } from "@chakra-ui/react";
import { generateSlug } from "random-word-slugs";
import { GameClient } from "../game/game.client";
import { Router } from "../router";

export const ErrorScreen = () => {
	const actor = GameClient.useContext();

	return (
		<Center h="100%" fontSize="2xl">
			<Stack align="center">
				<span onClick={() => console.log(actor)}>
					whoops something went boom
				</span>
				<Box>hopefully that doesnt happen in prod</Box>
				<HStack>
					<Button
						colorPalette="blue"
						size="lg"
						onClick={() =>
							actor.partySocket.send(
								JSON.stringify({ type: "party.snapshot.get" }),
							)
						}
					>
						Refresh the page
					</Button>
					<Button
						colorPalette="red"
						size="lg"
						onClick={() =>
							window.location.assign(Router.Room({ roomId: generateSlug() }))
						}
					>
						Or restart in another room
					</Button>
				</HStack>
			</Stack>
		</Center>
	);
};
