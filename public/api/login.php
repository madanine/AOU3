<?php
require_once 'config.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->identifier) || !isset($data->password)) {
    echo json_encode(["error" => "Missing credentials"]);
    exit();
}

$identifier = $data->identifier;
$password = $data->password;

// Check user
$stmt = $conn->prepare("SELECT * FROM users WHERE email = :id OR university_id = :id");
$stmt->execute(['id' => $identifier]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user && password_verify($password, $user['password_hash'])) {
    echo json_encode([
        "success" => true,
        "user" => [
            "id" => $user['id'],
            "universityId" => $user['university_id'],
            "fullName" => $user['full_name'],
            "email" => $user['email'],
            "role" => $user['role'],
            "phone" => $user['phone'],
            "major" => $user['major'],
            "is_disabled" => (bool)$user['is_disabled']
        ]
    ]);
} else {
    echo json_encode(["success" => false, "error" => "Invalid credentials"]);
}
?>
