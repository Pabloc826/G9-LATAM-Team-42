package EnergiAI.demo.service;

import EnergiAI.demo.client.DataScienceClient;
import EnergiAI.demo.client.GeminiClient;
import EnergiAI.demo.dto.AnalisisRequest;
import EnergiAI.demo.dto.AnalisisResponse;
import EnergiAI.demo.dto.PrediccionResponse;
import EnergiAI.demo.model.AnalisisEnergetico;
import EnergiAI.demo.repository.AnalisisEnergeticoRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class AnalisisService {

    private final AnalisisEnergeticoRepository repository;
    private final DataScienceClient dataScienceClient;
    private final GeminiClient geminiClient;
    private final TipoDeCambioService tipoDeCambioService;

    public AnalisisService(AnalisisEnergeticoRepository repository,
                           DataScienceClient dataScienceClient,
                           GeminiClient geminiClient,
                           TipoDeCambioService tipoDeCambioService) {
        this.repository = repository;
        this.dataScienceClient = dataScienceClient;
        this.geminiClient = geminiClient;
        this.tipoDeCambioService = tipoDeCambioService;
    }

    public AnalisisResponse procesarAnalisisEnergetico(AnalisisRequest request, Long usuarioId) {

        // 1. Asignar defaults a campos opcionales nulos antes de delegar
        if (request.getUso_horario_pico() == null) {
            request.setUso_horario_pico(0);
        }
        if (request.getAntiguedad_inmueble() == null) {
            request.setAntiguedad_inmueble(10);
        }
        if (request.getTiene_aire_acondicionado() == null) {
            request.setTiene_aire_acondicionado(0);
        }
        if (request.getTiene_calentador_electrico() == null) {
            request.setTiene_calentador_electrico(0);
        }
        if (request.getElectrodomesticos_eficientes() == null) {
            request.setElectrodomesticos_eficientes(0);
        }

        // 2. Delegar el análisis de datos (Ya sea al Mock o a la API Python)
        PrediccionResponse prediccion = dataScienceClient.obtenerPrediccion(request);

        // Creamos una lista modificable con las recomendaciones iniciales
        List<String> recomendacionesFinales = prediccion.getRecomendaciones() != null
                ? new ArrayList<>(prediccion.getRecomendaciones())
                : new ArrayList<>();

        // 3. Calcular la estimación financiera usando la tarifa del usuario (default 0.75 USD/kWh)
        double tarifaKwh = request.getTarifa_kwh() != null ? request.getTarifa_kwh() : 0.75;
        double costo_estimado = request.getConsumo_kwh() * tarifaKwh;

        // 4. Integración con IA: Siempre consultamos a Gemini para recomendaciones y conversión de moneda
        try {
            String consejoIA = geminiClient.obtenerRecomendacionIA(
                    prediccion.getCategoria(),
                    request.getConsumo_kwh(),
                    request.getCantidad_equipos(),
                    costo_estimado);
            recomendacionesFinales.add(consejoIA);
        } catch (Exception e) {
            // Fallback según categoría
            if ("Eficiente".equalsIgnoreCase(prediccion.getCategoria())) {
                recomendacionesFinales.add(
                        "¡Excelente! Mantén tus buenos hábitos de consumo energético.");
            } else {
                recomendacionesFinales.add(
                        "Se sugiere revisar los hábitos de consumo energético para mejorar la eficiencia.");
            }
        }

        //5. Agregar conversiones reales usando la API
        try {
            Map<String, Double> tasas = tipoDeCambioService.obtenerTasasLatam("USD");
            StringBuilder conversiones = new StringBuilder("CONVERSIÓN ESTIMADA:\n");

            tasas.forEach((moneda, tasa) -> {
                Double costoLocal = costo_estimado * tasa;
                conversiones.append(String.format("• %s: %.2f\n", moneda, costoLocal));
            });

            recomendacionesFinales.add(conversiones.toString());
        }catch (Exception e){
            System.out.println("No se pudieron obtener las tasas de cambio: " + e.getMessage());
        }

        // 6. Guardar en base de datos (incluye todos los nuevos campos)
        AnalisisEnergetico analisis = AnalisisEnergetico.builder()
                .consumoKwh(request.getConsumo_kwh())
                .usoHorarioPico(request.getUso_horario_pico())
                .cantidadEquipos(request.getCantidad_equipos())
                .tipoInmueble(request.getTipo_inmueble())
                .horasAltoConsumo(request.getHoras_alto_consumo())
                .personasVivienda(request.getPersonas_vivienda())
                .antiguedadInmueble(request.getAntiguedad_inmueble())
                .tieneAireAcondicionado(request.getTiene_aire_acondicionado())
                .tieneCalentadorElectrico(request.getTiene_calentador_electrico())
                .electrodomesticosEficientes(request.getElectrodomesticos_eficientes())
                .tarifaKwh(tarifaKwh)
                .usuarioId(usuarioId)
                .categoria(prediccion.getCategoria())
                .probabilidad(prediccion.getProbabilidad())
                .costoEstimadoMensual(costo_estimado)
                .recomendaciones(String.join(", ", recomendacionesFinales))
                .build();
        repository.save(analisis);

        // 7. Ensamblar la respuesta final
        return new AnalisisResponse(
                prediccion.getCategoria(),
                prediccion.getProbabilidad(),
                recomendacionesFinales,
                costo_estimado
        );
    }

    public List<AnalisisEnergetico> obtenerHistorial(Long usuarioId) {
        if (usuarioId == null) {
            return Collections.emptyList();
        }
        return repository.findByUsuarioIdOrderByFechaCreacionDesc(usuarioId);
    }

    public void eliminarAnalisis(Long id) {
        repository.deleteById(id);
    }
}
