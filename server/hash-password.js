import bcrypt from "bcryptjs";

const input = process.argv[2];

if (!input) {
  console.error("Usage: node server/hash-password.js <password>");
  process.exit(1);
}

const hash = await bcrypt.hash(String(input), 10);
console.log(hash);
