// 10 persona mẫu (theo .agent/05) chỉ để test gom BOM; không phải dữ liệu chạy của ứng dụng.
export const PERSONAS = [
  { id: 'P1', label: 'Dân gym nam', householdSize: 1, goals: ['high_protein', 'low_carb'], restrictions: [], mealsPerWeek: 6, deliveriesPerWeek: 1, payment: 'fresh_credit', zoneId: 'Z3' },
  { id: 'P2', label: 'Nữ văn phòng giảm mỡ', householdSize: 1, goals: ['low_carb'], restrictions: ['no_beef'], mealsPerWeek: 5, deliveriesPerWeek: 1, payment: 'card', zoneId: 'Z1' },
  { id: 'P3', label: 'Cần hạn chế đường', householdSize: 2, goals: ['limit_sugar', 'low_carb'], restrictions: [], mealsPerWeek: 5, deliveriesPerWeek: 1, payment: 'bank_transfer_4w', zoneId: 'Z5' },
  { id: 'P4', label: 'Dạ dày nhạy cảm', householdSize: 1, goals: ['gentle_digestion'], restrictions: ['no_spicy'], mealsPerWeek: 4, deliveriesPerWeek: 1, payment: 'card', zoneId: 'Z2' },
  { id: 'P5', label: 'Gia đình trẻ có con nhỏ', householdSize: 3, goals: ['balanced'], restrictions: ['no_spicy'], mealsPerWeek: 5, deliveriesPerWeek: 2, payment: 'fresh_credit', zoneId: 'Z2' },
  { id: 'P6', label: 'Đại gia đình ba thế hệ', householdSize: 6, goals: ['balanced'], restrictions: [], mealsPerWeek: 6, deliveriesPerWeek: 2, payment: 'bank_transfer_4w', zoneId: 'Z4' },
  { id: 'P7', label: 'Chuyên gia bận rộn độc thân', householdSize: 1, goals: ['balanced'], restrictions: [], mealsPerWeek: 4, deliveriesPerWeek: 1, payment: 'card', zoneId: 'Z1' },
  { id: 'P8', label: 'Ăn chay bán phần', householdSize: 2, goals: ['balanced'], restrictions: ['no_beef', 'no_pork'], mealsPerWeek: 4, deliveriesPerWeek: 1, payment: 'fresh_credit', zoneId: 'Z6' },
  { id: 'P9', label: 'Mẹ bỉm sữa sau sinh', householdSize: 2, goals: ['high_protein', 'gentle_digestion'], restrictions: ['no_spicy'], mealsPerWeek: 6, deliveriesPerWeek: 2, payment: 'bank_transfer_4w', zoneId: 'Z7' },
  { id: 'P10', label: 'Cặp đôi Gen Z mê Fusion', householdSize: 2, goals: ['balanced'], restrictions: [], mealsPerWeek: 5, deliveriesPerWeek: 1, payment: 'card', zoneId: 'Z8' }
];
