-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('WAITING', 'DRAWING', 'FINISHED');

-- AlterTable
ALTER TABLE "RoomMembers" ADD COLUMN     "left_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "max_players" INTEGER NOT NULL,
    "max_rounds" INTEGER NOT NULL,
    "status" "GameStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlayer" (
    "id" SERIAL NOT NULL,
    "game_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "turn_order" INTEGER NOT NULL,

    CONSTRAINT "GamePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" SERIAL NOT NULL,
    "game_id" INTEGER NOT NULL,
    "round_number" INTEGER NOT NULL,
    "drawer_id" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "round_limit" INTEGER NOT NULL DEFAULT 60,
    "status" "RoundStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRoundMessage" (
    "id" SERIAL NOT NULL,
    "game_round_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRoundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRoundScore" (
    "id" SERIAL NOT NULL,
    "game_round_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "game_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRoundScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GamePlayer_game_id_user_id_key" ON "GamePlayer"("game_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_game_id_round_number_key" ON "GameRound"("game_id", "round_number");

-- CreateIndex
CREATE INDEX "GameRoundMessage_game_round_id_idx" ON "GameRoundMessage"("game_round_id");

-- CreateIndex
CREATE UNIQUE INDEX "GameRoundScore_game_round_id_user_id_key" ON "GameRoundScore"("game_round_id", "user_id");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_drawer_id_fkey" FOREIGN KEY ("drawer_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundMessage" ADD CONSTRAINT "GameRoundMessage_game_round_id_fkey" FOREIGN KEY ("game_round_id") REFERENCES "GameRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundMessage" ADD CONSTRAINT "GameRoundMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundScore" ADD CONSTRAINT "GameRoundScore_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundScore" ADD CONSTRAINT "GameRoundScore_game_round_id_fkey" FOREIGN KEY ("game_round_id") REFERENCES "GameRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundScore" ADD CONSTRAINT "GameRoundScore_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
