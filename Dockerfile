FROM node:19-buster
RUN apt update && apt install -y default-jre
RUN npm install -g apk-mitm
WORKDIR /app
