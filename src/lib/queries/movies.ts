import { prisma } from "@/lib/db";
import { MovieStatus } from "@prisma/client";

export function getNowShowing() {
  return prisma.movie.findMany({
    where: { status: MovieStatus.NOW_SHOWING },
    orderBy: [{ featured: "desc" }, { releaseDate: "desc" }],
  });
}

export function getComingSoon() {
  return prisma.movie.findMany({
    where: { status: MovieStatus.COMING_SOON },
    orderBy: { releaseDate: "asc" },
  });
}

export function getFeaturedMovies() {
  return prisma.movie.findMany({
    where: { featured: true, status: { in: [MovieStatus.NOW_SHOWING, MovieStatus.COMING_SOON] } },
    orderBy: { releaseDate: "desc" },
    take: 6,
  });
}

export function getMovieBySlug(slug: string) {
  return prisma.movie.findUnique({
    where: { slug },
    include: {
      branches: { include: { branch: true } },
    },
  });
}

export function getPublishedPromotions() {
  const now = new Date();
  return prisma.promotion.findMany({
    where: { published: true, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { startDate: "desc" },
  });
}
