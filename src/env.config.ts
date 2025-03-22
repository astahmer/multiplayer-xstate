const Host = import.meta.env.VITE_API_HOST;
if (!Host) throw new Error("VITE_API_HOST is not set");

export const EnvConfig = {
	Host,
};
