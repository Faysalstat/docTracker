# infra

Standalone services for local development, run with Docker Compose.

| Service | Image | Port | Data |
|---|---|---|---|
| MongoDB | `mongo:8.0` | `127.0.0.1:27017` | named volume `doctor-tracker-mongo-data` |

## Usage

```bash
cp infra/.env.example infra/.env        # then change the passwords
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps   # wait for "healthy"
```

The API connects with the least-privilege app user. Put this in `api/.env`:

```
MONGODB_URI=mongodb://<MONGO_APP_USERNAME>:<MONGO_APP_PASSWORD>@localhost:27017/<MONGO_APP_DATABASE>?authSource=<MONGO_APP_DATABASE>
```

| Command | Effect |
|---|---|
| `docker compose -f infra/docker-compose.yml stop` | Stop the container; keeps the data |
| `docker compose -f infra/docker-compose.yml down` | Remove the container; keeps the data |
| `docker compose -f infra/docker-compose.yml down -v` | Remove the container **and delete all data** |

`mongo/init/*.js` scripts run only on the first start, when the volume is empty. To re-run them, use `down -v`.
