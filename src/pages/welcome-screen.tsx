import { Button, Center } from "@chakra-ui/react";
import { toaster } from "../components/ui/toaster";
import { UsernameSection } from "./username.section";

export const WelcomeScreen = (props: {
	setUsername: (username: string) => void;
}) => {
	const { setUsername } = props;

	return (
		<Center h="100%">
			<UsernameSection
				render={(username) => (
					<Button
						size="lg"
						borderRadius="md"
						disabled={!username.trim()}
						onClick={() => {
							if (!username.trim()) {
								return toaster.create({
									title: "Empty username",
									type: "error",
								});
							}

							localStorage.setItem("username", username);
							setUsername(username);
						}}
					>
						Join
					</Button>
				)}
			/>
		</Center>
	);
};
