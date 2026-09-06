import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "eu-west-3",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET ?? "";

const TYPES_AUTORISES = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX_OCTETS = 8 * 1024 * 1024; // 8 Mo

export function extensionValide(typeMime: string) {
  return TYPES_AUTORISES.includes(typeMime);
}

export function tailleValide(tailleOctets: number) {
  return tailleOctets > 0 && tailleOctets <= TAILLE_MAX_OCTETS;
}

export async function creerUrlUploadPresignee(cle: string, typeMime: string) {
  const commande = new PutObjectCommand({
    Bucket: BUCKET,
    Key: cle,
    ContentType: typeMime,
  });
  // URL valable 5 minutes : largement suffisant pour un upload immédiat côté client.
  const url = await getSignedUrl(s3, commande, { expiresIn: 300 });
  return url;
}

export function urlPubliqueDepuisCle(cle: string) {
  return `https://${BUCKET}.s3.${process.env.AWS_REGION ?? "eu-west-3"}.amazonaws.com/${cle}`;
}
