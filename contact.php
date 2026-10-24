<?php
declare(strict_types=1);

const CONTACT_RECIPIENT = 'ciao@nexvilo.it';
const CONTACT_FROM = 'ciao@nexvilo.it';
const CONTACT_MAX_REQUEST_BYTES = 16_384;
const CONTACT_RATE_LIMIT_WINDOW = 3_600;
const CONTACT_RATE_LIMIT_MAX_REQUESTS = 5;

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');

function respond(int $status, bool $ok, string $code): never
{
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'error' => $ok ? null : $code], JSON_UNESCAPED_SLASHES);
    exit;
}

function requestValue(string $key): ?string
{
    if (!array_key_exists($key, $_POST) || !is_string($_POST[$key])) {
        return null;
    }

    $value = trim(str_replace(["\r\n", "\r"], "\n", $_POST[$key]));
    if (!isValidUtf8($value)) {
        return $value;
    }

    return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
}

function isValidUtf8(string $value): bool
{
    return preg_match('//u', $value) === 1;
}

function characterLength(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function singleLine(string $value): string
{
    return preg_replace('/\s+/u', ' ', $value) ?? $value;
}

function sameOriginRequest(): bool
{
    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '') {
        return true;
    }

    $originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
    $requestHost = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $requestHost = preg_replace('/:\\d+$/', '', $requestHost) ?? '';

    return $originHost !== '' && hash_equals($requestHost, $originHost);
}

function allowRequestForIp(string $ip): bool
{
    $path = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'nexvilo-contact-' . hash('sha256', $ip) . '.json';
    $handle = @fopen($path, 'c+');
    if ($handle === false) {
        return false;
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            return false;
        }

        $contents = stream_get_contents($handle);
        $timestamps = json_decode($contents ?: '[]', true);
        if (!is_array($timestamps)) {
            $timestamps = [];
        }

        $now = time();
        $timestamps = array_values(array_filter($timestamps, static fn ($timestamp): bool => is_int($timestamp) && $timestamp > ($now - CONTACT_RATE_LIMIT_WINDOW)));
        if (count($timestamps) >= CONTACT_RATE_LIMIT_MAX_REQUESTS) {
            return false;
        }

        $timestamps[] = $now;
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($timestamps, JSON_UNESCAPED_SLASHES));
        fflush($handle);
        return true;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, false, 'method_not_allowed');
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > CONTACT_MAX_REQUEST_BYTES) {
    respond(413, false, 'payload_too_large');
}

if (!sameOriginRequest()) {
    respond(403, false, 'forbidden');
}

$name = requestValue('name');
$email = requestValue('email');
$service = requestValue('service');
$message = requestValue('message');
$honeypot = requestValue('website');

if ($honeypot === null || $name === null || $email === null || $service === null || $message === null) {
    respond(400, false, 'invalid_input');
}

if ($honeypot !== '') {
    respond(422, false, 'spam_detected');
}

$name = singleLine($name);

$services = [
    'website-design' => 'Website design',
    'ecommerce' => 'E-commerce',
    'mobile-app' => 'Mobile app',
    'custom-software' => 'Custom software',
    'seo-marketing' => 'SEO and digital marketing',
    'hosting-support' => 'Hosting and support',
    'other' => 'Other',
];

if (
    !isValidUtf8($name) || !isValidUtf8($email) || !isValidUtf8($message) ||
    characterLength($name) < 2 || characterLength($name) > 100 ||
    characterLength($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL) ||
    !array_key_exists($service, $services) ||
    characterLength($message) < 10 || characterLength($message) > 4_000
) {
    respond(422, false, 'validation_error');
}

$clientIp = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
if (!allowRequestForIp($clientIp)) {
    respond(429, false, 'rate_limited');
}

$body = implode("\n", [
    'New enquiry from the NEXVILO website',
    '',
    'Name: ' . $name,
    'Email: ' . $email,
    'Service: ' . $services[$service],
    '',
    'Message:',
    $message,
]);

$headers = implode("\r\n", [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: NEXVILO website <' . CONTACT_FROM . '>',
    'Reply-To: ' . $email,
]);

if (!@mail(CONTACT_RECIPIENT, 'NEXVILO website enquiry', $body, $headers)) {
    respond(500, false, 'send_failed');
}

respond(200, true, 'sent');
