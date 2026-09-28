# Held cameras

Taken out of `configs/` on 2026-09-28 and kept here verbatim, because they are
coming back under new names in a group of their own:

- `serval` — the original Q6358-LE at `serval.cam`. The name `serval` now
  belongs to a new camera of the same model.
- `event` — the Q6155-E at `event.cam`.

`cameras.json` and `specs.json` here are shaped like their counterparts in
`configs/`, so bringing one back is a rename and a copy. They live outside
`configs/` because the server loads every `.json` in that folder.

The old serval's untouched proportional speed, as echocontroller2 recorded
it on 2026-09-10, was 60 (`event`'s, 2026-09-20, was 60 too).
