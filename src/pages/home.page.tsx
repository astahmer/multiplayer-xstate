import { Center, Container } from "@chakra-ui/react";
import { generateSlug } from "random-word-slugs";
import { LinkButton } from "../components/ui/link-button";
import { Router } from "../router";
import { UsernameSection } from "./username.section";

export const HomePage = () => {
	return (
		<Container maxW="container.xl" py={8} width="100%" height="100%">
			<Center h="100%">
				<UsernameSection
					render={(username) => {
						localStorage.setItem("username", username);

						return (
							<LinkButton
								size="lg"
								borderRadius="md"
								to={Router.Room({ roomId: generateSlug() })}
							>
								Create room
							</LinkButton>
						);
					}}
				/>
			</Center>
		</Container>
	);
};
