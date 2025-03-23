import { Center, Stack } from "@chakra-ui/react";
import { HomePage } from "./pages/home.page";
import { RoomPage } from "./pages/room.page";
import { Router } from "./router";
import { Provider } from "./components/ui/provider";
import { LinkButton } from "./components/ui/link-button";
import { SandboxPage } from "./pages/sandbox.page";

export function App() {
	const route = Router.useRoute(["Home", "Room", "Sandbox"]);
	const routes = {
		Home: () => <HomePage />,
		Sandbox: () => <SandboxPage />,
		Room: ({ roomId }: { roomId: string }) => <RoomPage roomId={roomId} />,
		NotFound: () => (
			<Center h="100vh" fontSize="8xl" fontWeight="bold">
				<Stack>
					<span>404</span>
					<LinkButton to="/">Back to home</LinkButton>
				</Stack>
			</Center>
		),
	};

	return (
		<Provider>
			{route
				? routes[route.name]({
						roomId: route.name === "Room" ? route.params.roomId : "",
					})
				: routes.NotFound()}
		</Provider>
	);
}
