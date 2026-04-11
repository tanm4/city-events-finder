# City Events Finder

## Features
- Aggregates events from Ticketmaster & Eventbrite
- Removes duplicates
- Sorts by date

## Run Locally
npm install
node server.js

## Docker
docker build -t events-app .
docker run -p 8080:8080 events-app

## Deployment
Deployed using Google Cloud Run with Load Balancer.