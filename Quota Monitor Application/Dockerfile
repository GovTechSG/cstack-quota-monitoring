FROM node:alpine

# PLEASE UPDATE TO UNIQUE UID/GID FOR EACH PROJECT

ENV HOME=/app-root
ENV APP_UID=1001
ENV APP_USERNAME=container-user
ENV APP_GID=1001
ENV APP_GROUPNAME=container-group

WORKDIR ${HOME}

# Update
RUN apk --no-cache add curl

# RUN apk add --upgrade apk-tools && apk upgrade --available

# Set timezone to Singapore
RUN apk add tzdata
# Not working in node:alpine
#RUN mv /etc/localtime /etc/localtime.utc && \
#    ln -s /usr/share/zoneinfo/Asia/Singapore /etc/localtime.

# Add Default Application User
RUN addgroup -g ${APP_GID} ${APP_GROUPNAME} && \
    adduser -S -u ${APP_UID} -h ${HOME} -s /sbin/nologin -G ${APP_GROUPNAME} ${APP_USERNAME}

COPY ./container-fix-permission /usr/local/bin/container-fix-permission
COPY . ${HOME}
RUN rm -Rf ${HOME}/node_modules && \
    rm -Rf ${HOME}/container-fix-permission && \
    rm -Rf ${HOME}/__tests__ && \
    npm ci


# Fix permission for HOME and certificate location
RUN chown ${APP_UID}:${APP_GID} /usr/local/bin/container-fix-permission && \
    chmod og+rwx /usr/local/bin/container-fix-permission && \
    chown -R ${APP_UID}:${APP_GID} ${HOME} && \
    chmod -R og+rwx ${HOME} && \
    chmod -R 0777 /tmp

# Clear cache
RUN rm -rf /var/cache/apk/*

######### This may needs to be used in subsequent Dockerfile to run as non-root #########
######### Layer to fix permission for non-root https://github.com/sclorg/s2i-base-container/blob/master/bin/fix-permissions. #########
# You can add additional folders to fix-permission. e.g. 'RUN container-fix-permission "/{your-folder1} /{your-folder2}"'
RUN container-fix-permission > /dev/null
USER ${APP_UID}

EXPOSE 8080

CMD ["npm", "start"]