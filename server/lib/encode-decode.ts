type WSMessage = ArrayBuffer | ArrayBufferView | string;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const encode = <Payload>(payload: Payload) =>
	encoder.encode(JSON.stringify(payload));

export const decode = <Payload = any>(
	payload: WSMessage,
): Payload | undefined => {
	try {
		const dataAsString =
			typeof payload === "string" ? payload : decoder.decode(payload);
		return JSON.parse(dataAsString);
	} catch (err) {
		return undefined;
	}
};
