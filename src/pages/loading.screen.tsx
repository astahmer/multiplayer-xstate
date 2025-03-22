import { Center, Spinner } from "@chakra-ui/react";

export const LoadingScreen = () => {
	return (
		<Center h="100%">
			<Spinner css={{ "--spinner-size": "100px" }} borderWidth="thick" />
		</Center>
	);
};
