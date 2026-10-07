FROM mongo:8.0

# Init scripts are baked into the image instead of bind-mounted,
# so the setup works on any host drive/OS without host path sharing.
COPY init/ /docker-entrypoint-initdb.d/
