const multer = require('multer');

// Erlaubte Bildformate
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// Maximale Dateigröße: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Maximale Anzahl Bilder pro Request
const MAX_FILES = 5;

// Memory Storage - Bilder werden nicht auf Festplatte gespeichert
const storage = multer.memoryStorage();

// Dateifilter für Bildvalidierung
const fileFilter = (req, file, cb) => {
  // MIME-Type prüfen
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Ungültiges Bildformat. Erlaubt: ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()}`), false);
  }

  // Dateiendung prüfen
  const extension = file.originalname.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(new Error(`Ungültige Dateiendung. Erlaubt: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }

  cb(null, true);
};

// Multer-Konfiguration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES
  }
});

// Error Handler für Multer-Fehler
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: `Datei zu groß. Maximale Größe: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: `Zu viele Dateien. Maximum: ${MAX_FILES} Bilder`
      });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    return res.status(400).json({ error: err.message });
  }

  next();
};

module.exports = {
  upload,
  handleMulterError,
  MAX_FILE_SIZE,
  MAX_FILES,
  ALLOWED_EXTENSIONS
};
