<template>
  <div class="progress-tab-content">
    <div class="filter-bar">
      <label class="filter-label">Filter by Category:</label>
      <select v-model="reportCategory" class="select-input select-filter">
        <option 
          v-for="cat in categories" 
          :key="cat.id_cat || cat.id" 
          :value="cat.id_cat || cat.id"
        >
          {{ cat.icon }} {{ cat.name }}
        </option>
      </select>
    </div>

    <div class="report-table-container">
      <div v-if="isLoadingProgress" class="loading-report">
        Loading progress report...
      </div>
      <div v-else-if="filteredSortedReport.length === 0" class="no-words">
        No words match the selected category filter.
      </div>
      <table v-else class="report-table">
        <thead>
          <tr>
            <th @click="toggleReportSort('word')" class="sortable-header">
              Word <span v-if="reportSortKey === 'word'">{{ reportSortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th @click="toggleReportSort('scoreLvl1')" class="sortable-header">
              Lvl 1 (Easy) <span v-if="reportSortKey === 'scoreLvl1'">{{ reportSortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th @click="toggleReportSort('scoreLvl2')" class="sortable-header">
              Lvl 2 (Medium) <span v-if="reportSortKey === 'scoreLvl2'">{{ reportSortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th @click="toggleReportSort('scoreLvl3')" class="sortable-header">
              Lvl 3 (Hard) <span v-if="reportSortKey === 'scoreLvl3'">{{ reportSortDir === 'asc' ? '▲' : '▼' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredSortedReport" :key="row.id">
            <td class="word-col">{{ row.word }}</td>
            <td class="score-col">
              <span v-if="row.scoreLvl1 === undefined" class="no-score">—</span>
              <span v-else :class="['score-badge', getScoreClass(row.scoreLvl1)]">{{ row.scoreLvl1 }}</span>
            </td>
            <td class="score-col">
              <span v-if="row.scoreLvl2 === undefined" class="no-score">—</span>
              <span v-else :class="['score-badge', getScoreClass(row.scoreLvl2)]">{{ row.scoreLvl2 }}</span>
            </td>
            <td class="score-col">
              <span v-if="row.scoreLvl3 === undefined" class="no-score">—</span>
              <span v-else :class="['score-badge', getScoreClass(row.scoreLvl3)]">{{ row.scoreLvl3 }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { db } from '@/db/db'

const props = defineProps({
  categories: {
    type: Array,
    required: true
  },
  words: {
    type: Array,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
})

const progressScores = ref([])
const isLoadingProgress = ref(false)
const reportCategory = ref('')
const reportSortKey = ref('word')
const reportSortDir = ref('asc')

const loadProgressReport = async () => {
  isLoadingProgress.value = true
  try {
    const records = await db.progreso_usuario.toArray()
    const recordMap = new Map()
    records.forEach(r => {
      recordMap.set(`${r.word.toLowerCase()}||${r.sublevel}`, r.score || 0)
    })

    progressScores.value = props.words.map(w => {
      const wLower = w.word.toLowerCase()
      return {
        id: w.id,
        word: w.word,
        category: w.category,
        difficulty: w.difficulty,
        scoreLvl1: recordMap.get(`${wLower}||1`),
        scoreLvl2: recordMap.get(`${wLower}||2`),
        scoreLvl3: recordMap.get(`${wLower}||3`)
      }
    })
  } catch (error) {
    console.error('Failed to load progress report:', error)
  } finally {
    isLoadingProgress.value = false
  }
}

const toggleReportSort = (key) => {
  if (reportSortKey.value === key) {
    reportSortDir.value = reportSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    reportSortKey.value = key
    reportSortDir.value = 'asc'
  }
}

const filteredSortedReport = computed(() => {
  let list = progressScores.value

  if (reportCategory.value && reportCategory.value !== 'ALL') {
    list = list.filter(row => row.category === reportCategory.value)
  }

  return [...list].sort((a, b) => {
    let valA, valB

    if (reportSortKey.value === 'word') {
      valA = a.word.toLowerCase()
      valB = b.word.toLowerCase()
    } else {
      valA = a[reportSortKey.value] !== undefined ? a[reportSortKey.value] : -1
      valB = b[reportSortKey.value] !== undefined ? b[reportSortKey.value] : -1
    }

    if (valA < valB) return reportSortDir.value === 'asc' ? -1 : 1
    if (valA > valB) return reportSortDir.value === 'asc' ? 1 : -1
    return 0
  })
})

const getScoreClass = (score) => {
  if (score < 40) return 'score-red'
  if (score <= 70) return 'score-yellow'
  return 'score-green'
}

watch(() => props.isActive, (newActive) => {
  if (newActive) {
    loadProgressReport()
  }
})

watch(() => props.words, () => {
  if (props.isActive) {
    loadProgressReport()
  }
}, { deep: true })

onMounted(async () => {
  if (props.categories.length > 0) {
    const firstCat = props.categories[0]
    reportCategory.value = firstCat.id_cat || firstCat.id
  }
  if (props.isActive) {
    await loadProgressReport()
  }
})
</script>

<style scoped>
.progress-tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  overflow: hidden;
  height: 100%;
}

.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
}

.filter-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-dim);
}

.select-filter {
  width: 100%;
}

.select-input {
  background: rgba(13, 13, 43, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  border-radius: 12px;
  padding: 0.55rem;
  font-family: var(--font-main);
  font-size: 1rem;
  outline: none;
}

.report-table-container {
  flex: 1;
  overflow: auto;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.95rem;
}

.report-table th, 
.report-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
}

.report-table th {
  background: rgba(13, 13, 43, 0.5);
  color: var(--color-text-dim);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  z-index: 1;
  user-select: none;
}

.sortable-header {
  cursor: pointer;
  transition: color 0.2s ease;
}

.sortable-header:hover {
  color: var(--color-text-light);
}

.word-col {
  font-weight: 700;
  color: var(--color-text-light);
  text-transform: capitalize;
}

.score-col {
  text-align: center;
}

.no-score {
  color: rgba(255, 255, 255, 0.2);
  font-weight: 500;
}

.score-badge {
  display: inline-block;
  min-width: 38px;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-weight: 800;
  font-size: 0.85rem;
  text-align: center;
  border-bottom: 2px solid rgba(0, 0, 0, 0.15);
}

.score-red {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.score-yellow {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.score-green {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.loading-report {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-dim);
  font-weight: 600;
}

.no-words {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-text-dim);
  font-size: 1rem;
}

@media (max-width: 480px) {
  .filter-bar {
    margin-bottom: 0.75rem;
    gap: 0.15rem;
  }

  .filter-label {
    font-size: 0.85rem;
  }

  .select-input {
    padding: 0.45rem;
    font-size: 0.9rem;
    border-radius: 10px;
  }

  .report-table th, 
  .report-table td {
    padding: 0.5rem 0.6rem;
  }

  .report-table th {
    font-size: 0.75rem;
  }

  .word-col {
    font-size: 0.9rem;
  }

  .score-badge {
    min-width: 30px;
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
    border-radius: 6px;
  }
}
</style>
