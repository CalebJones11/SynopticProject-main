<!-- TABLE OF CONTENTS -->
## Table of Contents

* [About the Project](#about-the-project)
  * [Languages and tools used](#Languages-and-tools-used)
* [Starting Out](#Starting-Out)
  * [Prerequisites](#prerequisites)
  * [How To Use](#How-to-Use)



<!-- ABOUT THE PROJECT -->
## About The Project
This repository holds the code for my Synoptic project which is to build a quiz manager application. I opted to use a web application as it is what I am most familiar with. The project brings HTML, JavaScript and CSS together with the use of a MongoDB database to set up the Quiz management application.



### Languages and tools used

* [JavaScript](https://www.javascript.com/)
* [ExpressJS](https://expressjs.com/)
* [jQuery](https://jquery.com/)
* [HTML]
* [CSS]
* [MongoDB](https://www.mongodb.com/docs/)



<!-- GETTING STARTED -->
## Starting Out

In order to open the project as a whole in your web browser you will need to have the prerequisites and follow the instructions below.

## Prerequisites

The software you will need before starting is:
* npm - Simply run this command in your CLI (note this will install the latest version)
```sh
npm install npm@latest -g
```
* [node JS](https://nodejs.org/en/download/)

## How to Use
Once you have the prerequisites you will need to follow these instructions to run the app.

1. Clone the repository to your local machine using the CLI
```sh
git clone https://github.com/CalebJones11/SynopticProject
```
2. Install NPM packages in your local CLI that will install the package managers that this app uses
```sh
npm install
```

3. Run server the server in local CLI
```sh
node server.js
```

4. You will see the following:
```sh
Known users are configured
Server listening at http://localhost:3000
```
Copy http://localhost:3000 and paste into web browser of your choice

5. The web app will open and you will be prompted to log in
  Use the following for admin
  * Username: admin
  * Password: admin
  Use the following for viewer
  * Username: viewer
  * Password: viewer
    Use the following for user
  * Username: user
  * Password: user



6. Start using the app

* User permissions - There are 3 core user permissions:
  * **EDIT** - Highest permissions. Can edit, delete and create quizzes.
  * **VIEW** - High permissions. Cannot edit, delete or create quizzes but can view answers.
  * **RESTRICTED** - Normal permissions. Can only answer quizzes. Cannot see answers.


