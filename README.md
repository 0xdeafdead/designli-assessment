# Designli Code Challenge

This project is a code challenge for **Designli**, focused on developing an application that processes emails to extract JSON data.

## Challenge Description

The application should be able to retrieve JSON data from an email in the following scenarios:
1. The JSON file is attached to the email.
2. The JSON is included in the email body as a link.
3. The JSON is hosted on a website, and the website link is included in the email body.

The API endpoint should accept either:
- A file path to the email.
- A URL pointing to the email.

## Running the project

To run the project, clone the repository. Once in the repository directory.
```bash
npm install
```
Then to run 
```bash
npm run start
```
The project should run on port 3000 by default. 

## Testing

To use the endpoint with the email parser, hit http://localhost:3000/parser with a POST request.

Additionally, I've included a postman collection with the request to test the endpoint on the different scenarios.
Replace the `{projectWorkdirFromProject}` from the emailPath parameter on the queries from the postman collection with the local path where this projec is running on your machine if you intend to use the email files I included as example. Else, use the path from the `.eml` files you intend to use. On both cases, please, use full path.

All cases should return the same JSON named 'ses-sns-event.json' that's also included in this repository.

You can use the following JSON file for testing the second and third scenario:
[ses-sns-event.json](https://0xdeafdead.github.io/designli-assessment/ses-sns-event.json).

## License

This project is for assessment purposes only.
