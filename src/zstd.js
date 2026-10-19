const zlib = require('zlib');

const MAX_ZSTD_INPUT_BYTES = 256 * 1024 * 1024;
const MAX_FZSTD_FALLBACK_INPUT_BYTES = 96 * 1024 * 1024;
const MAX_ZSTD_OUTPUT_BYTES = 1024 * 1024 * 1024;

let fzstdModule = null;

function loadFzstd() {
	if (fzstdModule !== null) {
		return fzstdModule;
	}

	try {
		fzstdModule = require('fzstd');
	}
	catch {
		fzstdModule = false;
	}

	return fzstdModule;
}

function decompressZstd(buffer) {
	const input = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
	if (input.byteLength > MAX_ZSTD_INPUT_BYTES) {
		throw new Error(`Zstandard input exceeds ${MAX_ZSTD_INPUT_BYTES} bytes`);
	}

	if (typeof zlib.zstdDecompressSync === 'function') {
		const output = zlib.zstdDecompressSync(input, { maxOutputLength: MAX_ZSTD_OUTPUT_BYTES });
		if (output.byteLength > MAX_ZSTD_OUTPUT_BYTES) {
			throw new Error(`Zstandard output exceeds ${MAX_ZSTD_OUTPUT_BYTES} bytes`);
		}
		return output;
	}

	const fzstd = loadFzstd();
	if (fzstd && typeof fzstd.decompress === 'function') {
		if (input.byteLength > MAX_FZSTD_FALLBACK_INPUT_BYTES) {
			throw new Error(`Zstandard fallback input exceeds ${MAX_FZSTD_FALLBACK_INPUT_BYTES} bytes; use a Node/Electron runtime with native zstd support`);
		}
		const output = fzstd.decompress(input);
		const outputBuffer = Buffer.isBuffer(output) ? output : Buffer.from(output);
		if (outputBuffer.byteLength > MAX_ZSTD_OUTPUT_BYTES) {
			throw new Error(`Zstandard output exceeds ${MAX_ZSTD_OUTPUT_BYTES} bytes`);
		}
		return outputBuffer;
	}

	throw new Error('Zstandard decompression is unavailable. Install the `fzstd` runtime dependency or use a Node/Electron build with zstd support.');
}

module.exports = {
	decompressZstd,
};
