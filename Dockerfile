FROM armhf/node:7.7-slim
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
VOLUME /config
VOLUME /logs
VOLUME /video
ENV CONFIG_PATH /config
EXPOSE 8000
CMD [ "node", "index.js" ]
