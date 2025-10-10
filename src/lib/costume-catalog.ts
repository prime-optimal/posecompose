/**
 * Costume catalog utilities and helper functions
 * Simple API for managing costume data and interactions
 */

import type { CostumePreset } from '@/types/costume'
import { HALLOWEEN_COSTUMES } from '@/data/costumes'
import {
	fetchCostume,
	fetchCostumes,
	fetchFeaturedCostumes,
} from '@/services/costume-service'

/**
 * Get all costumes
 */
export const getAllCostumes = async (): Promise<CostumePreset[]> => {
	try {
		return await fetchCostumes()
	} catch (error) {
		console.error('Failed to load costumes via service, returning fallback set.', error)
		return HALLOWEEN_COSTUMES
	}
}

/**
 * Get costume by ID
 */
export const getCostumeById = async (
	id: string,
): Promise<CostumePreset | undefined> => {
	try {
		const costume = await fetchCostume(id)
		if (costume) {
			return costume
		}
	} catch (error) {
		console.error(`Failed to load costume ${id} via service.`, error)
	}

	return HALLOWEEN_COSTUMES.find(costume => costume.id === id)
}

/**
 * Get costumes by category
 */
export const getCostumesByCategory = async (
	category: string,
): Promise<CostumePreset[]> => {
	const costumes = await getAllCostumes()
	return costumes.filter(costume => costume.category === category)
}

/**
 * Get featured costumes
 */
export const getFeaturedCostumes = async (): Promise<CostumePreset[]> => {
	try {
		return await fetchFeaturedCostumes()
	} catch (error) {
		console.error('Failed to load featured costumes via service, using fallback set.', error)
		return HALLOWEEN_COSTUMES.filter(costume => costume.isFeatured)
	}
}

/**
 * Get new costumes
 */
export const getNewCostumes = async (): Promise<CostumePreset[]> => {
	const costumes = await getAllCostumes()
	return costumes.filter(costume => costume.isNew)
}

/**
 * Search costumes by query
 */
export const searchCostumes = async (query: string): Promise<CostumePreset[]> => {
	const lowercaseQuery = query.toLowerCase()
	const costumes = await getAllCostumes()
	return costumes.filter(costume =>
		costume.name.toLowerCase().includes(lowercaseQuery) ||
		costume.description.toLowerCase().includes(lowercaseQuery) ||
		costume.metadata.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)),
	)
}

/**
 * Sort costumes by specified criteria
 */
export const sortCostumes = (costumes: CostumePreset[], sortBy: string): CostumePreset[] => {
	const sorted = [...costumes]

	if (sortBy === 'popularity') {
		return sorted.sort(
			(a, b) => (b.metadata.popularityScore || 0) - (a.metadata.popularityScore || 0),
		)
	}

	if (sortBy === 'newest') {
		return sorted.sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)
	}

	if (sortBy === 'name-asc') {
		return sorted.sort((a, b) => a.name.localeCompare(b.name))
	}

	if (sortBy === 'name-desc') {
		return sorted.sort((a, b) => b.name.localeCompare(a.name))
	}

	if (sortBy === 'difficulty-asc') {
		const difficultyOrder = { easy: 1, medium: 2, hard: 3 }
		return sorted.sort(
			(a, b) => difficultyOrder[a.metadata.difficulty] - difficultyOrder[b.metadata.difficulty],
		)
	}

	if (sortBy === 'difficulty-desc') {
		const difficultyOrderDesc = { hard: 1, medium: 2, easy: 3 }
		return sorted.sort(
			(a, b) =>
				difficultyOrderDesc[a.metadata.difficulty] -
				difficultyOrderDesc[b.metadata.difficulty],
		)
	}

	return sorted
}
