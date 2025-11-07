package com.example.demo.entity;

import com.example.demo.entity.enums.LocationType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "locations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Location {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @Column(nullable = false)
    private String code;

    private String name;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Location parent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LocationType type = LocationType.BIN;
}
