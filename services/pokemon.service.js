/**
 * Pokemon Service
 * Handles external Pokemon API calls
 */

const POKEMON_API_BASE = 'https://pokeapi.co/api/v2';

class PokemonService {
    /**
     * DOCU: Get Pokemon details from PokeAPI <br>
     * Triggered: ConsumerController.processMessage() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf PokemonService
     * @param {string} pokemon_name - Pokemon name
     * @returns {Promise<Object>} Pokemon data
     * @author Vibe Team
     */
    static getPokemon = async (pokemon_name) => {
        const response = await fetch(`${POKEMON_API_BASE}/pokemon/${pokemon_name.toLowerCase()}`);
        
        if(!response.ok){
            throw new Error(`Pokemon API error: ${response.status} ${response.statusText}`);
        }
    
    const data = await response.json();
    
    return {
        name: data.name,
        id: data.id,
        height: data.height,
        weight: data.weight,
        types: data.types.map(t => t.type.name),
        abilities: data.abilities.map(a => a.ability.name),
        stats: data.stats.map(s => ({
            name: s.stat.name,
            value: s.base_stat
        }))
    };
};

    /**
     * DOCU: Get Pokemon ability details from PokeAPI <br>
     * Triggered: ConsumerController.processMessage() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf PokemonService
     * @param {string} ability_name - Ability name
     * @returns {Promise<Object>} Ability data
     * @author Vibe Team
     */
    static getPokemonAbility = async (ability_name) => {
        const response = await fetch(`${POKEMON_API_BASE}/ability/${ability_name.toLowerCase()}`);
        
        if(!response.ok){
            throw new Error(`Pokemon API error: ${response.status} ${response.statusText}`);
        }
    
    const data = await response.json();
    
    return {
        name: data.name,
        id: data.id,
        effect: data.effect_entries.find(e => e.language.name === 'en')?.effect || 'No effect description',
        pokemon: data.pokemon.slice(0, 10).map(p => p.pokemon.name)
        };
    };

    /**
     * DOCU: List Pokemon with pagination from PokeAPI <br>
     * Triggered: ConsumerController.processMessage() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf PokemonService
     * @param {number} limit - Number of results (default 20, max 100)
     * @param {number} offset - Pagination offset (default 0)
     * @returns {Promise<Object>} List of Pokemon
     * @author Vibe Team
     */
    static listPokemon = async (limit = 20, offset = 0) => {
        const safe_limit = Math.min(Math.max(1, limit), 100);
        const safe_offset = Math.max(0, offset);
        
        const response = await fetch(`${POKEMON_API_BASE}/pokemon?limit=${safe_limit}&offset=${safe_offset}`);
        
        if(!response.ok){
            throw new Error(`Pokemon API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
            count: data.count,
            next: data.next,
            previous: data.previous,
            results: data.results
        };
    };
}

module.exports = PokemonService;
