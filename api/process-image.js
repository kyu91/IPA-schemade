import formidable from 'formidable';
import sharp from 'sharp';
import axios from 'axios';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // multipart/form-data 처리를 위해 기본 바디 파서를 끕니다.
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = formidable({ multiples: false });

  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const email = fields.email?.[0];
    const password = fields.password?.[0];
    const opacity = fields.opacity?.[0];
    const file = files.image?.[0];

    // 1. 보안 검증
    if (email !== process.env.LOGIN_ID || password !== process.env.LOGIN_PW) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
    }

    if (!file) {
      return res.status(400).json({ error: 'No image uploaded.' });
    }

    const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
    if (!UNSPLASH_ACCESS_KEY) {
      return res.status(500).json({ error: 'Unsplash API key is not configured.' });
    }

    // 2. Unsplash 배경 이미지 가져오기
    const unsplashResponse = await axios.get('https://api.unsplash.com/photos/random', {
      params: { query: 'monochrome texture', orientation: 'landscape' },
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
    });
    const backgroundImageUrl = unsplashResponse.data.urls.regular;

    // 3. 이미지 처리 (Sharp)
    const targetOpacity = parseFloat(opacity) || 0.95;
    const fileBuffer = fs.readFileSync(file.filepath);
    let foregroundImage = sharp(fileBuffer);
    let foregroundMetadata = await foregroundImage.metadata();

    // 3. 랜덤 크롭 (0.1% ~ 0.5%)
    const cropRate = (Math.random() * (0.005 - 0.001) + 0.001);
    const cropWidth = Math.floor(foregroundMetadata.width * (1 - cropRate));
    const cropHeight = Math.floor(foregroundMetadata.height * (1 - cropRate));
    
    foregroundImage = foregroundImage.extract({
      left: Math.floor((foregroundMetadata.width - cropWidth) / 2),
      top: Math.floor((foregroundMetadata.height - cropHeight) / 2),
      width: cropWidth,
      height: cropHeight
    });
    
    // 크롭 후 '새로운 버킷'에 담아서 메타데이터를 확실히 갱신
    const croppedBuffer = await foregroundImage.toBuffer();
    foregroundImage = sharp(croppedBuffer);
    foregroundMetadata = await foregroundImage.metadata();
    
    // 전경 이미지 투명도 조절
    const foregroundRawBuffer = await foregroundImage.ensureAlpha().raw().toBuffer();
    for (let i = 0; i < foregroundRawBuffer.length; i += 4) {
      foregroundRawBuffer[i + 3] = Math.round(foregroundRawBuffer[i + 3] * targetOpacity);
    }

    const transparentForeground = sharp(foregroundRawBuffer, {
      raw: { width: foregroundMetadata.width, height: foregroundMetadata.height, channels: 4 }
    });

    // 배경 이미지 로드 및 리사이징
    const imageResponse = await axios({ url: backgroundImageUrl, responseType: 'arraybuffer' });
    const backgroundImageBuffer = await sharp(Buffer.from(imageResponse.data))
      .resize({ width: foregroundMetadata.width, height: foregroundMetadata.height, fit: 'cover' })
      .toBuffer();

    // 합성
    const processedImageBuffer = await transparentForeground
      .composite([{ input: backgroundImageBuffer, blend: 'dest-over' }])
      .png()
      .toBuffer();

    const base64Image = processedImageBuffer.toString('base64');
    res.status(200).json({ resultUrl: `data:image/png;base64,${base64Image}` });

  } catch (error) {
    console.error('Detailed Error Context:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).json({ error: `Failed to process image: ${error.message}` });
  }
}
