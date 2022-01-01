# parrot
> A minimal Discord Music Bot featuring similarity-based music playlist generation and voice clone text-to-speech.

## Features
1) Play Music/Audio from Youtube
2) Generate a music-similiarity playlist [YouTube Demo](https://www.youtube.com/watch?v=RnAiqSAiP3A)
3) TTS via voice clones of David Attenborough, Michael Rosen and LJ Speech (FastSpeech2 voice synthesis) [YouTube Demo](https://www.youtube.com/watch?v=YSc2GxM-1nU)

## Setup
See [CREATING_DEPLOYMENT_SECRETS.md](./doc/CREATING_DEPLOYMENT_SECRETS.md) for the secrets needed to run the bot.

### Docker-compose
Command `docker-compose up` is for development or quick launch ([Docker-compose docs](https://docs.docker.com/compose/)).

To use docker-compose, you'll need to create a file called `.env` in the project root directory with the following secrets, no quotes.

```
TOKEN = <your Discord bot token>
SPOTIFY_CLIENT = <optional>
SPOTIFY_SECRET = <optional>
```

## Works Cited
- https://towardsdatascience.com/how-to-build-an-amazing-music-recommendation-system-4cce2719a572?gi=6a54173f2d5d
- https://github.com/BenAAndrew/Voice-Cloning-App
- https://github.com/ming024/FastSpeech2
- https://Discord.com/developers/docs/intro
- https://github.com/Discordjs
- https://www.npmjs.com/package/@koenie06/Discord.js-music
