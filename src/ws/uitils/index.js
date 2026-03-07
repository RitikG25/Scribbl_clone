import prisma from "../../utils/prismaClient.js";
import jwt from "jsonwebtoken";

function parseCookies(cookieHeader) {
  return (
    cookieHeader?.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {}) || {}
  );
}

async function authenticateWS(request) {
  // Parse cookies from the raw upgrade request headers
  const cookies = parseCookies(request.headers.cookie);
  console.log(cookies);
  const token = cookies?.access_token;

  if (!token) throw new Error("No authorization token provided");

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error(
      err.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
    );
  }

  if (!payload?._id) throw new Error("Invalid credentials");

  const userId = Number(payload._id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) throw new Error("User not found");

  return user;
}

export default authenticateWS;
