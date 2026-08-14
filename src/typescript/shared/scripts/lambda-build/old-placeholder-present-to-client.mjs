export const handler = async (event) => {
  console.log("HANDLER REACHED! HELLO CLOUD WATCH")
  // TODO implement
  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!'),
  };
  return response;
};
