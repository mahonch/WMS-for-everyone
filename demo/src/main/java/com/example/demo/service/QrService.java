package com.example.demo.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Component
public class QrService {

    public byte[] generatePng(String payload, int size) {
        try {
            int s = Math.max(180, Math.min(size, 1000)); // границы
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());

            var matrix = new QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, s, s, hints);

            BufferedImage image = new BufferedImage(s, s, BufferedImage.TYPE_INT_RGB);
            // фон белый
            for (int x = 0; x < s; x++) {
                for (int y = 0; y < s; y++) {
                    image.setRGB(x, y, 0xFFFFFF);
                }
            }
            // рисуем модули
            for (int x = 0; x < s; x++) {
                for (int y = 0; y < s; y++) {
                    if (matrix.get(x, y)) image.setRGB(x, y, 0x000000);
                }
            }

            try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                ImageIO.write(image, "png", baos);
                return baos.toByteArray();
            }
        } catch (Exception e) {
            throw new IllegalStateException("QR generation failed", e);
        }
    }
}
