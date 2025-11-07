package com.example.demo.service;

import org.springframework.stereotype.Component;


@Component
public class QrService {
    public byte[] generatePng(String payload, int size) {
        try {
            var hints = new java.util.HashMap<com.google.zxing.EncodeHintType,Object>();
            hints.put(com.google.zxing.EncodeHintType.ERROR_CORRECTION, com.google.zxing.qrcode.decoder.ErrorCorrectionLevel.M);
            hints.put(com.google.zxing.EncodeHintType.CHARACTER_SET, "UTF-8");

            var matrix = new com.google.zxing.qrcode.QRCodeWriter()
                    .encode(payload, com.google.zxing.BarcodeFormat.QR_CODE, size, size, hints);

            var image = new java.awt.image.BufferedImage(size, size, java.awt.image.BufferedImage.TYPE_INT_RGB);
            for (int x = 0; x < size; x++)
                for (int y = 0; y < size; y++)
                    image.setRGB(x, y, matrix.get(x, y) ? 0x000000 : 0xFFFFFF);

            try (var baos = new java.io.ByteArrayOutputStream()) {
                javax.imageio.ImageIO.write(image, "png", baos);
                return baos.toByteArray();
            }
        } catch (Exception e) {
            throw new IllegalStateException("QR generation failed", e);
        }
    }
}
