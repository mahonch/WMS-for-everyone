package com.example.demo.dto;

public class CommitRequests {
    // Приёмка: куда размещаем товар
    public record ReceiptCommitRequest(Long toLocationId) {}

    // Выдача: откуда списываем и опционально куда отправляем
    public record IssueCommitRequest(Long fromLocationId,
                                     Long targetWarehouseId,
                                     Long targetLocationId,
                                     String reasonCode) {}

    // Перемещение: номер у документа уже есть, commit просто проводит
    public record TransferCommitRequest() {}
}
