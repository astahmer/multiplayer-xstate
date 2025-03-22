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
				actor.matches({ started: { game: "playing" } })
					? "purple"
					: actor.matches("starting") || actor.matches({ started: "preparing" })
						? "blue"
						: actor.matches("idle") ||
								actor.matches({ started: { preparing: "paused" } }) ||
								actor.matches({ started: { game: "paused" } })
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
			<GameClient.Matches value="starting">Starting...</GameClient.Matches>
			<GameClient.Matches value={{ started: { preparing: "waiting" } }}>
				{actor.context.timers.preparing
					? `Starting in ${actor.context.timers.preparing / 1000}s`
					: "Game is about to start..."}
			</GameClient.Matches>
			<GameClient.Matches value={{ started: { preparing: "paused" } }}>
				Waiting for{" "}
				{`${actor.context.actorList.filter((actor) => actor.getSnapshot().context.state !== "ready").length}/${actor.context.actorList.length}`}{" "}
				players
			</GameClient.Matches>
			<GameClient.Matches value={{ started: { game: "playing" } }}>
				Playing
			</GameClient.Matches>
			<GameClient.Matches value={{ started: { game: "paused" } }}>
				Paused
			</GameClient.Matches>
			<GameClient.Matches value="done">Game over!</GameClient.Matches>
		</Badge>
	);
};
