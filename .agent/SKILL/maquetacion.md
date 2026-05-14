# Skills de Maquetación (Frontend Prototyping)
Actualmente el proyecto está en fase de "Mockup Interactivo". NO hay base de datos ni backend configurado. Tu objetivo es hacer que el frontend se sienta 100% real y funcional utilizando simulación de datos y manejo de estado local.

Aplica siempre las siguientes habilidades en tu código:

## 1. Simulación de Datos (Mock Data Generation)
- NUNCA dejes listas o tablas vacías. 
- Siempre genera constantes con arrays de objetos JSON realistas al inicio del archivo o en una carpeta de `mockData`.
- Usa nombres venezolanos, cédulas realistas y terminología médica coherente para el "Hospital Adventista de Venezuela" (ej. diagnósticos CIE-10 comunes, medicamentos reales).

## 2. Interactividad con Estado Local (React Hooks)
- Todo debe ser clickeable. Si hay un botón para "Agregar Cita", debe abrir un modal o cambiar el estado usando `useState`.
- Si se "guarda" un formulario, el nuevo objeto debe agregarse temporalmente al array del estado local para que la interfaz se actualice instantáneamente.

## 3. Simulación de Latencia de Red (Fake Backend)
- Cuando el usuario envíe un formulario (ej. Login o Guardar Evolución), NO cambies la pantalla inmediatamente.
- Envuelve la lógica de "guardado" en un `setTimeout` de 1 o 2 segundos para simular una petición a la API.
- Durante este tiempo, el botón debe mostrar un estado de "Cargando..." (ej. un spinner o texto "Procesando...").

## 4. Renderizado Condicional en lugar de Enrutador (Conditional Rendering)
- Si aún no se ha configurado `react-router-dom`, simula la navegación entre pantallas (ej. pasar del Login al Dashboard) utilizando un estado global o local (ej. `const [currentView, setCurrentView] = useState('login')`).

## 5. Manejo de Errores y Validaciones Visuales
- Crea simulaciones de error. Por ejemplo, en el login, si el usuario deja el campo vacío, activa un estado de error que ponga el borde del input en rojo (`border-[#EF4444]`) y muestre un mensaje debajo del campo.