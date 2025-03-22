"use client";

import type { HTMLChakraProps, RecipeProps } from "@chakra-ui/react";
import { createRecipeContext } from "@chakra-ui/react";
import { Link } from "@swan-io/chicane";
import type { ComponentProps } from "react";

interface LinkProps extends ComponentProps<typeof Link> {}

export interface LinkButtonProps
	extends HTMLChakraProps<typeof Link, RecipeProps<"button">> {}

const { withContext } = createRecipeContext({ key: "button" });

// Replace "a" with your framework's link component
export const LinkButton = withContext<LinkProps, LinkButtonProps>(Link);
