package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.entity.enums.LocationType;
import com.example.demo.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ReceiptServiceIntegrationTest {

    @Autowired private ReceiptService receiptService;
    @Autowired private ReceiptRepository receiptRepository;
    @Autowired private ReceiptItemRepository receiptItemRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private WarehouseRepository warehouseRepository;
    @Autowired private LocationRepository locationRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StockRepository stockRepository;

    private User user;
    private Warehouse warehouse;
    private Location location;
    private Product product;

    @BeforeEach
    void setUp() {
        // базовые справочники
        warehouse = warehouseRepository.save(Warehouse.builder()
                .name("Main WH")
                .code("WH1")
                .isActive(true)
                .build());

        location = locationRepository.save(Location.builder()
                .warehouse(warehouse)
                .code("A1")
                .name("Rack A1")
                .type(LocationType.BIN)
                .build());

        product = productRepository.save(Product.builder()
                .sku("SKU1")
                .name("Test product")
                .unit("pcs")
                .costPrice(BigDecimal.ZERO)
                .minStock(0)
                .isActive(true)
                .build());

        user = userRepository.save(User.builder()
                .username("tester")
                .passwordHash("pwd")
                .active(true)
                .build());
    }

    @Test
    void commitMustFailWhenNoLocationProvided() {
        Receipt receipt = receiptRepository.save(Receipt.builder()
                .number("R-1")
                .warehouse(warehouse)
                .createdBy(user)
                .status(DocStatus.DRAFT)
                .totalSum(BigDecimal.ZERO)
                .build());

        ReceiptItem item = receiptItemRepository.save(ReceiptItem.builder()
                .receipt(receipt)
                .product(product)
                .qty(5)
                .price(new BigDecimal("10"))
                .build());

        receipt.getItems().add(item);
        receiptRepository.save(receipt);

        assertThrows(IllegalStateException.class,
                () -> receiptService.commit(receipt.getId(), null, user.getId()));
    }

    @Test
    void commitStoresItemsToGivenLocationAndUpdatesTotals() {
        Receipt receipt = receiptRepository.save(Receipt.builder()
                .number("R-2")
                .warehouse(warehouse)
                .createdBy(user)
                .status(DocStatus.DRAFT)
                .totalSum(BigDecimal.ZERO)
                .build());

        ReceiptItem item = receiptItemRepository.save(ReceiptItem.builder()
                .receipt(receipt)
                .product(product)
                .qty(3)
                .price(new BigDecimal("12.50"))
                .build());

        receipt.getItems().add(item);
        receiptRepository.save(receipt);

        receiptService.commit(receipt.getId(), location.getId(), user.getId());

        Receipt committed = receiptRepository.findById(receipt.getId()).orElseThrow();
        assertThat(committed.getStatus()).isEqualTo(DocStatus.COMMITTED);
        assertThat(committed.getTotalSum()).isEqualByComparingTo("37.50");

        List<Stock> stocks = stockRepository.findByLocation_Id(location.getId());
        assertThat(stocks).hasSize(1);
        assertThat(stocks.get(0).getQty()).isEqualTo(3);
        assertThat(stocks.get(0).getProduct().getId()).isEqualTo(product.getId());
    }
}
