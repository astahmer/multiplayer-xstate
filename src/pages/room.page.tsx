import { Container, Stack } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { getInitialContext } from "../../server/game.machine.context";
import { GameClient } from "../game/game.client";
import { ErrorScreen } from "./error.screen";
import { GameScreen } from "./game.screen";
import { LoadingScreen } from "./loading.screen";
import { WelcomeScreen } from "./welcome-screen";

export const RoomPage = (props: { roomId: string }) => {
	const { roomId } = props;

	const [username, setUsername] = useState(
		localStorage.getItem("username") || "",
	);

	const onJoin = (username: string) => {
		actor.send({
			type: "Connect",
			player: { name: username },
		});
	};

	const options: (typeof GameClient)["_useActorPropsType"] = useMemo(
		() => ({
			context: getInitialContext({ input: { roomId } }),
			partySocketOptions: { room: roomId },
			onConnect: () => {
				if (!username.trim()) return;
				onJoin(username);
			},
		}),
		[roomId],
	);
	const actor = GameClient.useActor(options);

	return (
		<Stack overflow="auto" h="100dvh">
			<Container maxW="7xl" py={8} h="100%">
				<GameClient.Context.Provider value={actor}>
					{actor.status === "stopped" ? (
						<LoadingScreen />
					) : actor.status === "error" ? (
						<ErrorScreen />
					) : username ? (
						<GameScreen />
					) : (
						<WelcomeScreen
							setUsername={(update) => {
								setUsername(update);

								if (update.trim()) {
									localStorage.setItem("username", update);
									onJoin(update);
								}
							}}
						/>
					)}
				</GameClient.Context.Provider>
			</Container>
		</Stack>
	);
};
