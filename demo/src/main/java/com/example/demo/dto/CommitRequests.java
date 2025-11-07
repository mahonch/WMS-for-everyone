package com.example.demo.dto;

public class CommitRequests {
    // Приёмка: куда размещаем товар
    public record ReceiptCommitRequest(Long toLocationId) {}

    // Выдача: откуда списываем
    public record IssueCommitRequest(Long fromLocationId) {}

    // Перемещение: номер у документа уже есть, commit просто проводит
    public record TransferCommitRequest() {}
}
