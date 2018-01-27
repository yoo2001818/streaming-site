FROM arm32v7/node:8-slim
RUN apt-get update && apt-get install -y libav-tools
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
VOLUME /config
VOLUME /logs
VOLUME /video
VOLUME /crop
ENV CONFIG_PATH /config
EXPOSE 8000
CMD [ "node", "index.js" ]
