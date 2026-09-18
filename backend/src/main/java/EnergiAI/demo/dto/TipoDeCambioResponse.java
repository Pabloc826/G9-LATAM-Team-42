package EnergiAI.demo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

public record TipoDeCambioResponse(
        String result,
        @JsonProperty("base_code") String baseCode,
        @JsonProperty("conversion_rates") Map<String, Double> conversionRates
) {}
