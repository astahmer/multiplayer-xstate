import { Badge, Flex, HStack, Heading } from "@chakra-ui/react";
import { GameClient } from "./game.client";

export const GameHeader = () => {
	const actor = GameClient.useContext();
	const playerList = actor.context.actorList.map(
		(ref) => ref.getSnapshot().context,
	);

	return (
		<Flex
			justify="space-between"
			align="center"
			position="relative"
			marginTop="-2"
		>
			<Heading size="xl">Multiplayer State Machine</Heading>
			<GameStatus />
			<GameClient.Matches value="idle">
				<HStack fontSize="lg">
					<span>Ready:</span>
					<span>{`${playerList.filter((player) => player.state === "ready").length}/${playerList.length}`}</span>
				</HStack>
			</GameClient.Matches>
		</Flex>
	);
};

const GameStatus = () => {
	const actor = GameClient.useContext();

	return (
		<Badge
			position="absolute"
			top="50%"
			left="50%"
			transform="translate3d(-50%, -25%, 0)"
			colorPalette={
				actor.matches("playing")
					? "blue"
					: actor.matches("idle")
						? "yellow"
						: actor.matches("done")
							? "green"
							: "gray"
			}
			fontSize="xl"
			p={2}
		>
			<GameClient.Matches value="idle">
				Waiting for{" "}
				{`${actor.context.actorList.filter((actor) => actor.getSnapshot().context.state !== "ready").length}/${actor.context.actorList.length}`}{" "}
				players
			</GameClient.Matches>
			<GameClient.Matches value="playing">Playing</GameClient.Matches>
			<GameClient.Matches value="done">Game over!</GameClient.Matches>
		</Badge>
	);
};
