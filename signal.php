<?php
// Nano Chat - message queue for shared PHP hosting. No database, no libraries.
// Clients poll this file; each conversation is one small JSON file under data/
// (chat-<visitor>.php). Nothing fancy: visitors leave messages, the operator
// reads the queue and replies. All over plain HTTPS - no WebRTC, no relay.
//
// Roles:
//   - the OPERATOR console goes online as the business handle (password gated)
//   - VISITORS start a throwaway visitor-* chat and message the business
// Branding/labels/subjects live in data/config.json (written by admin.php);
// the admin password hash lives in data/admin.json and is NEVER served out.

header('Content-Type: application/json');
header('Cache-Control: no-store');
// the embed widget reads the public config from other sites - allow it
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

// Per-site bootstrap defines the outside-webroot config paths and the gate.
// Missing = this install has not been set up yet; point the caller at install.php.
$__bootstrap = __DIR__ . '/bootstrap.php';
if (!is_file($__bootstrap)) {
    http_response_code(503);
    echo json_encode(['error' => 'not-installed', 'detail' => 'Run install.php to set up Nano Chat.']);
    exit;
}
require $__bootstrap;            // defines NANO_CALL_CONFIG_PATH / _ADMIN_PATH / _DATA_DIR / _BOOTSTRAPPED
require __DIR__ . '/licence.php';

// how much text we accept in one message, and how long a finished chat lingers
$MAX_TEXT        = 4000;
$RESERVE_SECONDS = 30 * 86400;   // browser-token ownership window
$CHAT_TTL        = 14 * 86400;   // closed/idle visitor chats swept after this

$DATA = NANO_CALL_DATA_DIR;             // transient chat files (in webroot)
if (!is_dir($DATA)) { mkdir($DATA, 0755, true); }

// settings + licence key (config.json) and the admin password hash (admin.json)
// live OUTSIDE the webroot - paths come from bootstrap.php. The transient
// chat-/seen- files stay in $DATA, guard-protected (see licence.php).
$CONFIG_FILE = NANO_CALL_CONFIG_PATH;
$ADMIN_FILE  = NANO_CALL_ADMIN_PATH;

// config the app falls back to before the admin has ever saved anything
function default_config() {
    return [
        'business'    => 'reception',
        'brandName'   => 'Our Team',
        'accent'      => '#ff4d00',
        'logo'        => '',
        'greeting'    => 'Chat with us - we are happy to help.',
        'buttonLabel' => 'Chat with us',
        'theme'       => 'auto',
        'position'    => 'bottom-right',
        'subjects'    => ['General enquiry'],
        'site_url'    => '',
        'licence_key' => '',
        'configured'  => false,
    ];
}
function read_config() {
    global $CONFIG_FILE;   // outside webroot - plain JSON, no guard needed
    if (is_file($CONFIG_FILE)) {
        $c = json_decode((string) file_get_contents($CONFIG_FILE), true);
        if (is_array($c)) return array_merge(default_config(), $c);
    }
    return default_config();
}
function read_admin() {
    global $ADMIN_FILE;    // outside webroot - plain JSON, no guard needed
    if (is_file($ADMIN_FILE)) {
        $a = json_decode((string) file_get_contents($ADMIN_FILE), true);
        if (is_array($a)) return $a;
    }
    return [];
}

// a name is only ever a-z 0-9 _ - so it can never escape the data dir
function clean_name($n) {
    $n = strtolower(trim((string) $n));
    return preg_match('/^[a-z0-9_-]{1,40}$/', $n) ? $n : null;
}

function chat_path($id) { global $DATA; return "$DATA/chat-$id.php"; }
function seen_path($n)  { global $DATA; return "$DATA/seen-$n.php"; }

// presence: you are online if your browser polled in the last 12 seconds
function read_seen($n) {
    $f = seen_path($n);
    if (!is_file($f)) return [0, ''];
    $raw   = nano_call_data_unwrap((string) file_get_contents($f));
    $parts = explode('|', $raw, 2);
    return [(int) $parts[0], $parts[1] ?? ''];
}
function write_seen($n, $token) { return file_put_contents(seen_path($n), nano_call_data_wrap(time() . '|' . $token)) !== false; }
function is_online($n) { [$t, ] = read_seen($n); return (time() - $t) < 12; }

function reply($obj) { echo json_encode($obj); exit; }

// read a conversation file (no lock - reads are safe); null if it does not exist
function read_chat($id) {
    $f = chat_path($id);
    if (!is_file($f)) return null;
    $raw = nano_call_data_unwrap((string) file_get_contents($f));
    $c   = $raw ? json_decode($raw, true) : null;
    return is_array($c) ? $c : null;
}

// read-modify-write a conversation under an exclusive lock. $fn receives the
// current chat (or null if new) and returns the chat to store, or null to skip.
function with_chat($id, $fn) {
    $fp = fopen(chat_path($id), 'c+');
    if (!$fp) reply(['error' => 'storage']);
    flock($fp, LOCK_EX);
    $raw  = nano_call_data_unwrap(stream_get_contents($fp));
    $chat = $raw ? (json_decode($raw, true) ?: null) : null;
    $out  = $fn($chat);
    if (is_array($out)) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, nano_call_data_wrap(json_encode($out)));
    }
    flock($fp, LOCK_UN);
    fclose($fp);
    return $out;
}

// keep data/ tidy: closed or long-idle visitor chats are dropped. Runs on a
// small fraction of requests so it never adds latency to a live conversation.
function sweep_old() {
    global $DATA, $CHAT_TTL;
    if (rand(1, 25) !== 1) return;
    foreach (glob("$DATA/chat-visitor-*.php") ?: [] as $f) {
        if (time() - (int) @filemtime($f) > $CHAT_TTL) { @unlink($f); }
    }
    foreach (glob("$DATA/seen-visitor-*.php") ?: [] as $f) {
        if (time() - (int) @filemtime($f) > 3600) { @unlink($f); }
    }
}

// trim + cap a chunk of message text
function clean_text($t) {
    global $MAX_TEXT;
    $t = trim((string) $t);
    if ($t === '') return null;
    if (function_exists('mb_substr')) { $t = mb_substr($t, 0, $MAX_TEXT); }
    else { $t = substr($t, 0, $MAX_TEXT); }
    return $t;
}

$in     = json_decode((string) file_get_contents('php://input'), true) ?: [];
$action = $in['action'] ?? ($_GET['action'] ?? '');
$token  = preg_replace('/[^a-f0-9-]/', '', (string) ($in['token'] ?? ''));
$me     = clean_name($in['me'] ?? '');

$cfg      = read_config();
$business = clean_name($cfg['business']) ?: 'reception';
$subjects = array_values((array) $cfg['subjects']);

// is this request coming from the authenticated operator console?
function is_operator($token) {
    global $business;
    [$t, $owner] = read_seen($business);
    return $owner !== '' && $owner === $token && (time() - $t) < 12;
}

// config is public and read cross-origin (GET, no token) by the embed widget
if ($action === 'config') {
    reply(['config' => [
        'business'    => $business,
        'brandName'   => (string) $cfg['brandName'],
        'accent'      => (string) $cfg['accent'],
        'logo'        => (string) $cfg['logo'],
        'greeting'    => (string) $cfg['greeting'],
        'buttonLabel' => (string) $cfg['buttonLabel'],
        'theme'       => (string) $cfg['theme'],
        'position'    => (string) $cfg['position'],
        'poweredBy'   => nano_call_show_powered_by((string) $cfg['site_url'], (string) $cfg['licence_key']),
        'subjects'    => $subjects,
        'configured'  => (bool) $cfg['configured'],
        'online'      => is_online($business),   // is the operator console live right now?
    ]]);
}

// everything else is a token-bearing call
if (!$token) reply(['error' => 'bad-token']);

switch ($action) {

    case 'register-host':
        // ONLY the admin password can put a console online as the business
        // handle - otherwise a stranger could read and answer every chat
        if (!$me || $me !== $business) reply(['error' => 'not-host']);
        $admin = read_admin();
        $hash  = $admin['passHash'] ?? '';
        if ($hash === '') reply(['error' => 'no-admin']);   // admin not set up yet
        if (!password_verify((string) ($in['password'] ?? ''), $hash)) {
            reply(['error' => 'bad-password']);
        }
        if (!write_seen($me, $token)) reply(['error' => 'storage']);
        reply(['registered' => $me]);

    case 'start':
        // a visitor opens (or re-opens) their conversation with the business
        if (!$me || $me === $business) reply(['error' => 'bad-name']);
        [, $owner] = read_seen($me);
        if ($owner !== '' && $owner !== $token) reply(['error' => 'name-taken']);
        $subject = (string) ($in['subject'] ?? '');
        if (!in_array($subject, $subjects, true)) { $subject = $subjects[0] ?? 'General enquiry'; }
        $first = clean_text($in['text'] ?? '');
        sweep_old();
        write_seen($me, $token);
        with_chat($me, function ($chat) use ($me, $subject, $first) {
            if (!is_array($chat)) {
                $chat = [
                    'id'           => $me,
                    'visitor_name' => $me,
                    'subject'      => $subject,
                    'status'       => 'open',
                    'created_at'   => time(),
                    'messages'     => [],
                ];
            } else {
                $chat['status'] = 'open';   // re-opening a closed chat
                unset($chat['closed_by']);
            }
            if ($first !== null) { $chat['messages'][] = ['from' => 'visitor', 'text' => $first, 'ts' => time()]; }
            return $chat;
        });
        reply(['ok' => true, 'id' => $me, 'subject' => $subject]);

    case 'send':
        // append one message to a conversation. Visitors may only write to
        // their own chat; "operator" messages require the live operator token.
        // A send only counts as the operator when the sender IS the business
        // handle - so a visitor who happens to share a browser token with the
        // operator is still treated as a visitor (writes to their own chat).
        $asOperator = ($me === $business) && is_operator($token);
        $chatId = $asOperator ? clean_name($in['chat'] ?? '') : $me;
        $text   = clean_text($in['text'] ?? '');
        if (!$chatId || $text === null) reply(['error' => 'bad-send']);
        if (!$asOperator) {
            [, $owner] = read_seen($me);
            if ($me !== $chatId || ($owner !== '' && $owner !== $token)) reply(['error' => 'not-yours']);
            write_seen($me, $token);
        } else {
            write_seen($business, $token);   // keep operator presence fresh
        }
        $from = $asOperator ? 'operator' : 'visitor';
        $ok = with_chat($chatId, function ($chat) use ($from, $text) {
            if (!is_array($chat)) return null;           // no such chat
            // a new message re-opens a closed chat - clear the "who closed it" flag
            if (($chat['status'] ?? '') !== 'open') { $chat['status'] = 'open'; unset($chat['closed_by']); }
            $chat['messages'][] = ['from' => $from, 'text' => $text, 'ts' => time()];
            return $chat;
        });
        if (!is_array($ok)) reply(['error' => 'no-chat']);
        reply(['ok' => true]);

    case 'poll':
        if (!$me) reply(['error' => 'bad-name']);

        if ($me === $business) {
            // OPERATOR: must be the authenticated console
            if (!is_operator($token)) reply(['error' => 'not-host']);
            write_seen($business, $token);
            // build the queue: one summary line per conversation
            $list = [];
            foreach (glob("$DATA/chat-*.php") ?: [] as $f) {
                $id = substr(basename($f, '.php'), 5);   // "chat-<id>" -> "<id>"
                $c = read_chat($id);
                if (!is_array($c)) continue;
                $msgs = $c['messages'] ?? [];
                $last = end($msgs) ?: null;
                $list[] = [
                    'id'       => $c['id'] ?? '',
                    'subject'  => $c['subject'] ?? '',
                    'status'   => $c['status'] ?? 'open',
                    'count'    => count($msgs),
                    'last'     => $last ? (string) $last['text'] : '',
                    'lastFrom' => $last ? (string) $last['from'] : '',
                    'updated'  => $last ? (int) $last['ts'] : (int) ($c['created_at'] ?? 0),
                    'online'   => is_online($c['id'] ?? ''),
                ];
            }
            usort($list, fn($a, $b) => $b['updated'] <=> $a['updated']);
            // if a specific chat is open in the console, return its full thread
            $thread = null;
            $open = clean_name($in['chat'] ?? '');
            if ($open) { $c = read_chat($open); if (is_array($c)) $thread = $c; }
            reply(['chats' => $list, 'thread' => $thread]);
        }

        // VISITOR: return only their own conversation
        [, $owner] = read_seen($me);
        if ($owner !== '' && $owner !== $token) reply(['error' => 'name-taken']);
        write_seen($me, $token);
        $c = read_chat($me);
        reply([
            'messages'       => is_array($c) ? ($c['messages'] ?? []) : [],
            'status'         => is_array($c) ? ($c['status'] ?? 'open') : 'open',
            'closedBy'       => is_array($c) ? ($c['closed_by'] ?? '') : '',
            'operatorOnline' => is_online($business),
        ]);

    case 'close':
        // operator (or the visitor themselves) marks a conversation finished
        $asOperator = ($me === $business) && is_operator($token);
        $chatId = $asOperator ? clean_name($in['chat'] ?? '') : $me;
        if (!$chatId) reply(['error' => 'bad-name']);
        if (!$asOperator) {
            [, $owner] = read_seen($me);
            if ($me !== $chatId || ($owner !== '' && $owner !== $token)) reply(['error' => 'not-yours']);
        }
        with_chat($chatId, function ($chat) use ($asOperator) {
            if (!is_array($chat)) return null;
            $chat['status']    = 'closed';
            $chat['closed_by'] = $asOperator ? 'operator' : 'visitor';   // so the other side can be told who closed it
            return $chat;
        });
        reply(['ok' => true]);

    case 'delete':
        // operator deletes ONE conversation for good (junk, spam, finished).
        // Operator-only: closing is reversible, deleting is not.
        if (!(($me === $business) && is_operator($token))) reply(['error' => 'not-host']);
        $chatId = clean_name($in['chat'] ?? '');
        if (!$chatId) reply(['error' => 'bad-name']);
        @unlink(chat_path($chatId));
        @unlink(seen_path($chatId));    // drop the visitor's presence marker too
        reply(['ok' => true]);

    case 'purge':
        // operator bulk-clears conversations. scope:
        //   'closed' (default) - every chat marked closed
        //   'all'              - every chat, open or closed (nuclear; UI confirms)
        if (!(($me === $business) && is_operator($token))) reply(['error' => 'not-host']);
        $scope   = ($in['scope'] ?? 'closed') === 'all' ? 'all' : 'closed';
        $removed = 0;
        foreach (glob("$DATA/chat-*.php") ?: [] as $f) {
            $id = substr(basename($f, '.php'), 5);     // "chat-<id>" -> "<id>"
            if ($scope === 'closed') {
                $c = read_chat($id);
                if (!is_array($c) || ($c['status'] ?? '') !== 'closed') continue;
            }
            @unlink($f);
            @unlink(seen_path($id));
            $removed++;
        }
        reply(['ok' => true, 'removed' => $removed]);
}

reply(['error' => 'bad-action']);
