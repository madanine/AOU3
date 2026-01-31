<?php
// Simple script to test connection and setup tables if needed
require_once 'config.php';

$sql = file_get_contents('../../database.sql');

try {
    $conn->exec($sql);
    echo "Database structure created successfully.";
} catch(PDOException $e) {
    echo "Error creating table: " . $e->getMessage();
}
?>
